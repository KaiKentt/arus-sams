import os
import sys
import time
from datetime import datetime, timezone
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

def get_emergency_station_ids():
    """Finds mapped stations whose latest water_data status is alert, warning, or danger."""
    response = supabase.table("school_station").select("station_id").execute()
    mapped_station_ids = list({row["station_id"] for row in response.data})

    emergency_ids = []
    for station_id in mapped_station_ids:
        latest = (
            supabase.table("water_data")
            .select("status")
            .eq("station_id", station_id)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        if latest.data and latest.data[0]["status"] in ("alert", "warning", "danger"):
            emergency_ids.append(station_id)

    return emergency_ids

def run_telemetry_pipeline(target_school_id=None, target_station_ids=None):
    """
    Runs the pipeline in one of 3 modes:
    1. target_school_id provided -> Force Sync for a single school
    2. target_station_ids provided -> 10-min Quick Emergency Check for flooding stations only
    3. Neither provided -> 30-min Master Sync for all mapped schools + 7-day cleanup
    """
    if target_school_id:
        mode_text = f"for School ID: {target_school_id}"
        response = supabase.table("school_station").select("station_id").eq("school_id", target_school_id).execute()
        active_station_ids = list({row['station_id'] for row in response.data})
    elif target_station_ids:
        mode_text = f"(10-MIN EMERGENCY QUICK CHECK: {len(target_station_ids)} station(s))"
        active_station_ids = target_station_ids
    else:
        mode_text = "(30-MIN ALL SCHOOLS MASTER SYNC)"
        response = supabase.table("school_station").select("station_id").execute()
        active_station_ids = list({row['station_id'] for row in response.data})

    print(f"🌊 Starting Arus-SAMS Telemetry Pipeline {mode_text}...")

    if not active_station_ids:
        print("❌ No stations mapped for this request. Exiting.")
        return

    # Fetch the details for only the stations we care about
    station_lookup = supabase.table("stations").select(
        "station_id, station_name, normal_level, alert_level, warning_level, danger_level"
    ).in_("station_id", active_station_ids).execute()
    
    target_station_names = [s['station_name'] for s in station_lookup.data]
    print(f"🎯 Targeting {len(target_station_names)} specific station(s): {target_station_names}")

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

    # 4. Run Database Housekeeping ONLY if this is a full 30-min master sync
    if not target_school_id and not target_station_ids:
        print("🧹 Running automated 7-day housekeeping...")
        supabase.rpc("delete_old_water_data", {}).execute()
    
    print(f"🚀 Pipeline Complete! Successfully updated {inserted_count} stations.")

# --- 3. DAEMON LISTENER (REAL-TIME BRIDGE FOR LOCAL DEV) ---
def listen_for_sync_requests():
    """Continuously polls Supabase to see if a Headmaster clicked 'Force Sync'."""
    print("\n🎧 Telemetry Worker is running and listening for targeted Headmaster sync requests...")
    
    while True:
        try:
            response = supabase.table("schools").select("school_id").eq("sync_requested", True).execute()
            
            if response.data:
                for school in response.data:
                    school_id = school['school_id']
                    print(f"\n⚡ FORCE SYNC TRIGGERED for School ID: {school_id}")
                    run_telemetry_pipeline(target_school_id=school_id)
                    supabase.table("schools").update({"sync_requested": False}).eq("school_id", school_id).execute()
                    
                print("\n✅ Targeted sync complete. Flags reset. Returning to listening mode...\n")
            else:
                time.sleep(3)
                
        except Exception as e:
            print(f"⚠️ Listener encountered an error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    try:
        # 1. Check if a Headmaster clicked 'Force Sync'
        pending = supabase.table("schools").select("school_id").eq("sync_requested", True).execute()

        if pending.data:
            for school in pending.data:
                school_id = school["school_id"]
                print(f"⚡ FORCE SYNC DETECTED for School ID: {school_id}")
                run_telemetry_pipeline(target_school_id=school_id)
        else:
            # 2. Automated Schedule: Check if we are at the 30-min mark (:00 or :30) or a 10-min Emergency mark
            current_minute = datetime.now(timezone.utc).minute

            # Allow a 4-minute window (0..4 and 30..34) for GitHub runner boot time on :00 and :30 ticks
            if current_minute in (0, 1, 2, 3, 4, 30, 31, 32, 33, 34):
                run_telemetry_pipeline()
            else:
                # We are on a :10, :20, :40, or :50 tick -> Check for flooding stations
                emergency_ids = get_emergency_station_ids()
                if emergency_ids:
                    print(f"🚨 EMERGENCY TICK (:10/:20/:40/:50) — Syncing {len(emergency_ids)} station(s) in alert/warning/danger.")
                    run_telemetry_pipeline(target_station_ids=emergency_ids)
                else:
                    # Fallback if someone manually clicked 'Run workflow' in GitHub UI off-schedule
                    run_telemetry_pipeline()

    finally:
        # 3. Always reset sync_requested to False so the React Force Sync button never gets stuck
        try:
            supabase.table("schools").update({"sync_requested": False}).eq("sync_requested", True).execute()
            print("🔓 Verified all sync_requested flags are reset to False.")
        except Exception as e:
            print(f"⚠️ Could not reset sync flags: {e}")

    # 4. Exit cleanly in GitHub Actions (--once), or keep listening if run locally
    if "--once" in sys.argv:
        print("✅ Single sync complete. Exiting.")
    else:
        listen_for_sync_requests()