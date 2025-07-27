import json
import os
import time
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOKR_WEATHER_API_KEY")
BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"

with open("ballparkLocations.json", encoding="utf-8") as f:
    ballparks = json.load(f)


def get_base_datetime():
    now = datetime.now()
    base_times = ["2300", "2000", "1700", "1400", "1100", "0800", "0500", "0200"]
    for bt in base_times:
        hour = int(bt[:2])
        base = now.replace(hour=hour, minute=0, second=0, microsecond=0)
        if now >= base:
            return base.strftime("%Y%m%d"), bt
    base = now - timedelta(days=1)
    return base.strftime("%Y%m%d"), "2300"


base_date, base_time = get_base_datetime()

prev_map = {}
prev_path = "public/data/kboBallparkForecast.json"
if os.path.exists(prev_path):
    try:
        with open(prev_path, encoding="utf-8") as f:
            prev_json = json.load(f)
            prev_map = {p["stadium"]: p for p in prev_json.get("data", [])}
    except Exception:
        prev_map = {}

results = []
for park in ballparks:
    nx, ny = park["nx"], park["ny"]
    params = {
        "serviceKey": API_KEY,
        "pageNo": "1",
        "numOfRows": "1000",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": nx,
        "ny": ny,
    }

    entry = None
    for attempt in range(2):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            items = data["response"]["body"]["items"]["item"]
            forecast = {}
            for item in items:
                fcst_time = item["fcstTime"]
                if fcst_time not in forecast:
                    forecast[fcst_time] = {}
                forecast[fcst_time][item["category"]] = item["fcstValue"]

            entry = {
                "team": park["team"],
                "stadium": park["stadium"],
                "location": {"nx": nx, "ny": ny},
                "forecasts": forecast,
            }
            if attempt == 0:
                print(f"✅ Success: {park['stadium']}")
            else:
                print(f"✅ Success on retry: {park['stadium']}")
            break
        except Exception as e:
            if attempt == 0:
                print(f"❌ Failed: {park['stadium']} / {e} -> retrying")
                time.sleep(1)
            else:
                print(f"❌ Failed again: {park['stadium']} / {e}")
                if park["stadium"] in prev_map:
                    entry = prev_map[park["stadium"]]
                    print(f"↩️  Using previous data for {park['stadium']}")
                else:
                    print(f"⚠️  No previous data for {park['stadium']}")
    if entry:
        results.append(entry)

output = {
    "updatedAt": datetime.now().isoformat(),
    "data": results,
}

with open("public/data/kboBallparkForecast.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
