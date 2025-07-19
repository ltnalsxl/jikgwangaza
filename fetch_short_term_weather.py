import requests
import json
import os
from datetime import datetime, timedelta
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

        results.append({
            "team": park["team"],
            "stadium": park["stadium"],
            "location": {"nx": nx, "ny": ny},
            "forecasts": forecast,
        })
        print(f"✅ Success: {park['stadium']}")
    except Exception as e:
        print(f"❌ Failed: {park['stadium']} / {e}")

output = {
    "updatedAt": datetime.now().isoformat(),
    "data": results,
}

with open("public/data/kboBallparkForecast.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
