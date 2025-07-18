import json
import os
from datetime import datetime, timezone, timedelta
import requests

BASE_URL = "https://apis.data.go.kr/1360000/RoadWthrInfoService/getCctvStnRoadWthr"
SERVICE_KEY = os.environ.get("GOKR_WEATHER_API_KEY")

if not SERVICE_KEY:
    raise SystemExit("GOKR_WEATHER_API_KEY environment variable not set")

with open("public/data/ballpark_weather_sources.json", "r", encoding="utf-8") as f:
    sources = json.load(f)

results = []
for item in sources:
    params = {
        "serviceKey": SERVICE_KEY,
        "pageNo": "1",
        "numOfRows": "1",
        "dataType": "JSON",
        "eqmtId": item["eqmtId"],
        "hhCode": "00",
    }
    try:
        resp = requests.get(BASE_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        weather = (
            data.get("response", {})
            .get("body", {})
            .get("items", {})
            .get("item", [{}])[0]
            .get("weatherNm", "정보없음")
        )
    except Exception as e:
        print("Failed to fetch", item["eqmtId"], e)
        weather = "정보없음"
    results.append({
        "team": item["team"],
        "stadium": item["stadium"],
        "weatherNm": weather,
        "eqmtId": item["eqmtId"],
    })

kst = timezone(timedelta(hours=9))
output = {
    "updatedAt": datetime.now(kst).isoformat(),
    "data": results,
}

with open("public/data/kboBallparkWeather.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
    f.write("\n")
