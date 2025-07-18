import json
import os
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen

BASE_URL = "https://apis.data.go.kr/1360000/RoadWthrInfoService/getCctvStnRoadWthr"
SERVICE_KEY = os.environ.get("GOKR_WEATHER_API_KEY")

if not SERVICE_KEY:
    raise SystemExit("GOKR_WEATHER_API_KEY environment variable not set")

with open("public/data/stadiumCctvIds.json", "r", encoding="utf-8") as f:
    sources = json.load(f)

kst = timezone(timedelta(hours=9))
now = datetime.now(kst)

results = []
for item in sources:
    eqmt_ids = item.get("eqmtIds") or [item.get("eqmtId")]
    eqmt_ids = [e for e in eqmt_ids if e]
    if not eqmt_ids:
        continue

    weather = "정보없음"
    used_id = eqmt_ids[0]

    for eqmt_id in eqmt_ids:
        params = {
            "serviceKey": SERVICE_KEY,
            "pageNo": "1",
            "numOfRows": "1",
            "dataType": "JSON",
            "eqmtId": eqmt_id,
            "hhCode": "00",
        }
        try:
            url = BASE_URL + "?" + urlencode(params)
            with urlopen(url, timeout=10) as resp:
                data = json.load(resp)
            items = (
                data.get("response", {})
                .get("body", {})
                .get("items", {})
                .get("item", [])
            )
            if not items:
                continue
            info = items[0]
            w = info.get("weatherNm", "정보없음")
            base_date = info.get("baseDate")
            base_time = info.get("baseTime")
            base_dt = None
            if base_date and base_time:
                try:
                    base_dt = datetime.strptime(
                        base_date + base_time, "%Y%m%d%H%M"
                    ).replace(tzinfo=kst)
                except ValueError:
                    base_dt = None

            if w != "정보없음" and (
                base_dt is None or now - base_dt <= timedelta(hours=2)
            ):
                weather = w
                used_id = eqmt_id
                break
        except Exception as e:
            print("Failed to fetch", eqmt_id, e)

    results.append(
        {
            "team": item["team"],
            "stadium": item.get("stadiumName") or item.get("stadium"),
            "weatherNm": weather,
            "eqmtId": used_id,
        }
    )

output = {
    "updatedAt": now.isoformat(),
    "data": results,
}

with open("public/data/kboBallparkWeather.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
    f.write("\n")
