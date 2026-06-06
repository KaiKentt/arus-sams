import os
import time
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


def clean_number(val):
    try:
        # Handles empty strings or dashes from the government website
        if not val or val.strip() == '-' or val.strip() == '':
            return 0.0
        return float(val.strip())
    except ValueError:
        return 0.0


def get_max_pages(soup):
    """Finds the highest page number in the pagination block."""
    pagination = soup.find('ul', class_='pagination')
    if not pagination:
        return 1

    links = pagination.find_all('a')
    page_numbers = []
    for link in links:
        try:
            # Extracts the '8' from '?page=8'
            page_num = int(link['href'].split('page=')[1])
            page_numbers.append(page_num)
        except (IndexError, ValueError):
            continue

    # Return the absolute highest number it found in the buttons
    return max(page_numbers) if page_numbers else 1


def sync_all_stations():
    print(
        f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting iHYDRO Master Station Sync...")

    # 1. Do an initial request to find out how many pages exist
    initial_url = "https://ihydro.sarawak.gov.my/iHydro/en/datatable/waterlevel/latest-waterlevel.jsp?page=1"
    initial_response = requests.get(initial_url, headers=HEADERS, timeout=15)

    if initial_response.status_code != 200:
        print("⚠️ Failed to reach iHYDRO. Stopping sync.")
        return

    initial_soup = BeautifulSoup(initial_response.text, "html.parser")

    # Calculate the max pages dynamically! (Usually 8)
    max_pages = get_max_pages(initial_soup)
    print(f"📊 Discovered {max_pages} total pages of station data to process.")

    total_upserted = 0

    # --- 2. THE STRICT LOOP (No more infinite loops!) ---
    for page in range(1, max_pages + 1):
        url = f"https://ihydro.sarawak.gov.my/iHydro/en/datatable/waterlevel/latest-waterlevel.jsp?page={page}"
        print(f"📄 Scraping Page {page}/{max_pages}...")

        response = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")

        rows = soup.find_all("tr", height="25")
        stations_batch = []

        # --- 3. DATA EXTRACTION ---
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 10:
                continue

            link_tag = cells[1].find("a")
            if not link_tag:
                continue

            station_name = link_tag.text.strip()
            href = link_tag['href']
            station_no = href.split("station=")[1]

            division = cells[2].text.strip()
            river_basin = cells[3].text.strip()

            # Extract threshold levels (Fixed to correctly match the HTML columns)
            normal_level = clean_number(cells[6].text)
            alert_level = clean_number(cells[7].text)
            warning_level = clean_number(cells[8].text)
            danger_level = clean_number(cells[9].text)

            stations_batch.append({
                "station_no": station_no,
                "station_name": station_name,
                "division": division,
                "river_basin": river_basin,
                "normal_level": normal_level,
                "alert_level": alert_level,
                "warning_level": warning_level,
                "danger_level": danger_level
            })

        # --- 4. UPSERT TO DATABASE ---
        if stations_batch:
            try:
                supabase.table("stations").upsert(
                    stations_batch,
                    on_conflict="station_no"
                ).execute()

                print(f"✅ Upserted {len(stations_batch)} stations.")
                total_upserted += len(stations_batch)
            except Exception as e:
                print(f"❌ Database error on Page {page}: {e}")

        time.sleep(1)  # Brief pause so we don't overload the government server

    print(f"🎉 Sync Complete! {total_upserted} total stations processed.")


if __name__ == "__main__":
    sync_all_stations()
