import os
import time
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# --- 1. SUPABASE CONNECTION SETUP ---
# Securely load credentials from your hidden .env file
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# iHYDRO Setup
IHYDRO_TARGET_URL = "https://ihydro.sarawak.gov.my/iHydro/en/datatable/waterlevel/latest-waterlevel.jsp?page=1"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
POLL_INTERVAL_SECONDS = 900


# --- 2. THE CORE SCRAPING FUNCTION ---
def fetch_and_log_telemetry():
    print(
        f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Fetching live data from iHYDRO...")

    try:
        response = requests.get(IHYDRO_TARGET_URL, headers=HEADERS, timeout=15)

        if response.status_code != 200:
            print(
                f"⚠️ Failed to reach iHYDRO. Status Code: {response.status_code}")
            return

        soup = BeautifulSoup(response.text, "html.parser")
        station_link = soup.find(
            'a', string=lambda text: text and 'Batu Kawa Bridge' in text)

        if not station_link:
            print(
                "⚠️ Could not find 'Batu Kawa Bridge' on the page. Did the layout change?")
            return

        row = station_link.find_parent('tr')
        cells = row.find_all('td')

        # Extract Data
        station_name = station_link.text.strip()
        live_water_level = float(cells[5].text.strip())
        # <--- NEW: Pulls the exact timestamp from the website!
        recorded_time = cells[4].text.strip()

        href = station_link['href']
        scraped_station_no = href.split("station=")[1]

        print(
            f"✅ Data parsed: {station_name} -> {live_water_level}m at {recorded_time}")

        # Push to Supabase
        station_lookup = supabase.table("stations").select(
            "station_id").eq("station_no", scraped_station_no).execute()

        if len(station_lookup.data) > 0:
            internal_station_id = station_lookup.data[0]['station_id']

            # Insert the new reading into the historical water_data table
            supabase.table("water_data").insert({
                "station_id": internal_station_id,
                "water_level": live_water_level,
                "recorded_at": recorded_time  # <--- NEW: Saves the scraped timestamp!
            }).execute()

            print("✅ Database insert successful! Sleeping until next cycle...")
        else:
            print(
                f"⚠️ Station '{scraped_station_no}' not found in Supabase 'stations' table.")

    except Exception as e:
        print(f"❌ An error occurred during the cycle: {e}")


# --- 3. THE AUTOMATION LOOP ---
print("🚀 Starting Arus-SAMS Telemetry Background Service...")
print(f"Polling interval set to: {POLL_INTERVAL_SECONDS / 60} minutes.")

# This loop runs forever until you press Ctrl+C in the terminal
while True:
    fetch_and_log_telemetry()
    time.sleep(POLL_INTERVAL_SECONDS)
