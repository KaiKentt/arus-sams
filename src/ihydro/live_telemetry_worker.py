import os
import time
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

# --- 1. SUPABASE CONNECTION SETUP ---
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Increased timeout to 30 seconds to prevent Supabase cold-start errors
options = ClientOptions(postgrest_client_timeout=30.0)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=options)

# --- 2. CONFIGURATION ---
BASE_URL = "https://ihydro.sarawak.gov.my/iHydro/en/datatable/waterlevel/latest-waterlevel.jsp?page="
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def get_total_pages():
    """Silently visits Page 1 to calculate exactly how many pages exist today."""
    try:
        response = requests.get(f"{BASE_URL}1", headers=HEADERS, timeout=45)
        soup = BeautifulSoup(response.text, "html.parser")
        
        page_numbers = []
        for link in soup.select('.pagination a'):
            if link.text.strip().isdigit():
                page_numbers.append(int(link.text.strip()))
        
        max_pages = max(page_numbers) if page_numbers else 1
        time.sleep(1) 
        return max_pages
    except Exception as e:
        print(f"❌ Error finding pages: {e}")
        return 1

def scrape_live_data(max_pages, target_station_names=None):
    """Scrapes pages and STOPS EARLY if all target stations are found."""
    live_data_dict = {}
    
    for page in range(1, max_pages + 1):
        print(f"📡 Scraping Page {page}/{max_pages}...")
        try:
            response = requests.get(f"{BASE_URL}{page}", headers=HEADERS, timeout=45)
            soup = BeautifulSoup(response.text, "html.parser")
            rows = soup.find_all("tr")
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 6: 
                    station_link = row.find('a')
                    if station_link and 'station=' in station_link.get('href', ''):
                        station_name = station_link.text.strip()
                        
                        # OPTIMIZATION 1: Ignore stations we don't care about
                        if target_station_names and station_name not in target_station_names:
                            continue
                            
                        try:
                            water_level = float(cells[5].text.strip())
                            live_data_dict[station_name] = water_level
                        except ValueError:
                            continue 
            
            # OPTIMIZATION 2: The "Early Break"
            # If we found exactly the amount of stations we requested, stop scraping!
            if target_station_names and len(live_data_dict) == len(target_station_names):
                print(f"🎯 Found all {len(target_station_names)} requested stations! Stopping scraper early to save resources.")
                break
                
            time.sleep(1)

        except requests.exceptions.ReadTimeout:
            print(f"⚠️ Page {page} timed out! Skipping...")
            continue
        except Exception as e:
            print(f"❌ Unexpected error on Page {page}: {e}")
            continue

    return live_data_dict

def determine_status(water_level, normal, alert, warning, danger):
    """Calculates the flood state based on the station's specific thresholds."""
    if water_level >= danger:
        return 'danger'
    elif water_level >= warning:
        return 'warning'
    elif water_level >= alert:
        return 'alert'
    else:
        return 'normal'

def run_telemetry_pipeline(target_school_id=None):
    """Runs the pipeline. If target_school_id is provided, it only syncs that school's stations."""
    mode_text = f"for School ID: {target_school_id}" if target_school_id else "(ALL SCHOOLS MASTER SYNC)"
    print(f"🌊 Starting Arus-SAMS Telemetry Pipeline {mode_text}...")

    # 1. Figure out which stations we actually need
    query = supabase.table("school_station").select("station_id")
    if target_school_id:
        query = query.eq("school_id", target_school_id)
        
    response = query.execute()
    active_station_ids = list({row['station_id'] for row in response.data})

    if not active_station_ids:
        print("❌ No stations mapped for this request. Exiting.")
        return

    # Fetch the details for only the stations we care about
    station_lookup = supabase.table("stations").select(
        "station_id, station_name, normal_level, alert_level, warning_level, danger_level"
    ).in_("station_id", active_station_ids).execute()
    
    target_station_names = [s['station_name'] for s in station_lookup.data]
    print(f"🎯 Targeting {len(target_station_names)} specific station(s)...")

    # 2. Map the live website (Passing in our specific targets for the Early Break)
    max_pages = get_total_pages()
    live_ihydro_data = scrape_live_data(max_pages, target_station_names)

    # 3. Cross-reference, Calculate, and Insert
    inserted_count = 0
    for station in station_lookup.data:
        station_name = station['station_name']
        
        if station_name in live_ihydro_data:
            current_water_level = live_ihydro_data[station_name]
            current_status = determine_status(
                current_water_level,
                station['normal_level'],
                station['alert_level'],
                station['warning_level'],
                station['danger_level']
            )
            
            supabase.table("water_data").insert({
                "station_id": station['station_id'],
                "water_level": current_water_level,
                "status": current_status
            }).execute()
            
            print(f"✅ Logged {station_name}: {current_status.upper()} at {current_water_level}m")
            inserted_count += 1
        else:
            print(f"⚠️ Warning: {station_name} was offline or not found on iHYDRO today.")

    # 4. Run Database Housekeeping ONLY if this is a master sync
    if not target_school_id:
        print("🧹 Running automated 7-day housekeeping...")
        supabase.rpc("delete_old_water_data", {}).execute()
    
    print(f"🚀 Pipeline Complete! Successfully updated {inserted_count} stations.")

# --- 3. DAEMON LISTENER (REAL-TIME BRIDGE) ---
def listen_for_sync_requests():
    """Continuously polls Supabase to see if a Headmaster clicked 'Force Sync'."""
    print("\n🎧 Telemetry Worker is running and listening for targeted Headmaster sync requests...")
    
    while True:
        try:
            # Check if ANY school has requested a sync
            response = supabase.table("schools").select("school_id").eq("sync_requested", True).execute()
            
            if response.data:
                # Loop through the schools that pressed the button
                for school in response.data:
                    school_id = school['school_id']
                    print(f"\n⚡ FORCE SYNC TRIGGERED for School ID: {school_id}")
                    
                    # Run the pipeline passing ONLY their school ID
                    run_telemetry_pipeline(target_school_id=school_id)
                    
                    # Reset the flag back to false for this specific school
                    supabase.table("schools").update({"sync_requested": False}).eq("school_id", school_id).execute()
                    
                print("\n✅ Targeted sync complete. Flags reset. Returning to listening mode...\n")
                
            else:
                time.sleep(3) # Check every 3 seconds
                
        except Exception as e:
            print(f"⚠️ Listener encountered an error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    import sys

    # 1. Run the standard pipeline for ALL schools
    run_telemetry_pipeline(target_school_id=None)

    # 2. Clear any pending 'Force Sync' flags from the web dashboard
    try:
        supabase.table("schools").update({"sync_requested": False}).eq("sync_requested", True).execute()
    except Exception as e:
        print(f"⚠️ Could not reset sync flags: {e}")

    # 3. If '--once' is passed (used by GitHub Actions), exit cleanly; otherwise listen locally
    if "--once" in sys.argv:
        print("✅ Single scheduled sync complete. Exiting.")
    else:
        listen_for_sync_requests()