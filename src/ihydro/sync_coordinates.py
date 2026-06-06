import os
import re
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# --- 1. SETUP ---
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
}
MAP_URL = "https://ihydro.sarawak.gov.my/iHydro/en/map/maps.jsp"

def sync_coordinates():
    print("🌍 Fetching map data from iHYDRO...")
    response = requests.get(MAP_URL, headers=HEADERS, timeout=15)
    
    if response.status_code != 200:
        print(f"❌ Failed to load the map page. Status Code: {response.status_code}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    
    # 1. Find the hidden input containing the massive data array
    xml_input = soup.find("input", {"id": "xml"})
    if not xml_input:
        print("❌ Could not find the hidden 'xml' data block.")
        return
        
    raw_data = xml_input["value"]
    
    # 2. Use Regex to perfectly extract Lat, Lon, and Station No.
    # This ignores all the messy HTML and grabs exactly what we need!
    pattern = r"(?:'Combine'|'Rainfall'|'Water')\s*,\s*([0-9.-]+)\s*,\s*([0-9.-]+)\s*,.*?station=(\d+)"
    matches = re.finditer(pattern, raw_data)

    update_count = 0
    print("🚀 Pushing coordinates to Supabase...")

    # 3. Update the existing stations
    for match in matches:
        lat = float(match.group(1))
        lon = float(match.group(2))
        station_no = match.group(3)
        
        try:
            # We use update() to attach the GPS data to the stations we already synced
            supabase.table("stations").update({
                "latitude": lat,
                "longitude": lon
            }).eq("station_no", station_no).execute()
            
            print(f"📍 Mapped Station {station_no} -> Lat: {lat}, Lon: {lon}")
            update_count += 1
        except Exception as e:
            print(f"⚠️ Failed to map {station_no}: {e}")

    print(f"\n🎉 Success! Added exact GPS coordinates to {update_count} stations.")

if __name__ == "__main__":
    sync_coordinates()