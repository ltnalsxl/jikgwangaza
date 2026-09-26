"""KBO 구장별 단기예보 수집.

- 1순위: 기상청 단기예보(data.go.kr, GOKR_WEATHER_API_KEY 필요)
- 2순위: Open-Meteo (키 불필요) — 기상청 API 실패/키 없음/구장별 실패 시 대체

예전 버전의 문제:
1. GitHub Actions(UTC) 시간으로 base_date/base_time을 계산해 항상 9시간 묵은 발표를 요청했다.
2. 예보를 fcstTime(시각)만으로 묶어서, 오늘 18시 값이 모레 18시 값으로 덮어써졌다.
3. updatedAt에 타임존이 없어 브라우저에서 9시간 어긋나게 표시됐다.
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # dotenv는 로컬 개발 편의용
    pass

KST = ZoneInfo("Asia/Seoul")
API_KEY = os.getenv("GOKR_WEATHER_API_KEY")
KMA_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OUTPUT_PATH = "public/data/kboBallparkForecast.json"
BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]
# 기상청은 발표 시각 약 10분 뒤부터 API로 제공한다.
PUBLISH_DELAY = timedelta(minutes=15)


def get_base_datetime(now: datetime | None = None) -> tuple[str, str]:
    """가장 최근에 공개된 단기예보 발표 시각(KST)을 반환."""
    now = (now or datetime.now(KST)).astimezone(KST)
    available = now - PUBLISH_DELAY
    for hour in reversed(BASE_HOURS):
        base = available.replace(hour=hour, minute=0, second=0, microsecond=0)
        if available >= base:
            return base.strftime("%Y%m%d"), base.strftime("%H%M")
    prev = available - timedelta(days=1)
    return prev.strftime("%Y%m%d"), "2300"


def fetch_kma(park: dict, base_date: str, base_time: str) -> dict:
    params = {
        "serviceKey": API_KEY,
        "pageNo": "1",
        "numOfRows": "1500",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": park["nx"],
        "ny": park["ny"],
    }
    resp = requests.get(KMA_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    header = data.get("response", {}).get("header", {})
    if header.get("resultCode") not in (None, "00"):
        raise ValueError(f"KMA {header.get('resultCode')}: {header.get('resultMsg')}")
    items = data["response"]["body"]["items"]["item"]

    by_date: dict[str, dict[str, dict]] = {}
    for item in items:
        slot = by_date.setdefault(item["fcstDate"], {}).setdefault(item["fcstTime"], {})
        slot[item["category"]] = item["fcstValue"]
    return by_date


def _sky_from_cloud(cloud_pct):
    # 기상청 하늘상태: 1 맑음(0~5할), 3 구름많음(6~8할), 4 흐림(9~10할)
    if cloud_pct is None:
        return ""
    if cloud_pct <= 50:
        return "1"
    if cloud_pct <= 80:
        return "3"
    return "4"


def _pty_from_wmo(code):
    # 기상청 강수형태: 0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기
    if code is None:
        return "0"
    if code in (71, 73, 75, 77, 85, 86):
        return "3"
    if code in (66, 67):
        return "2"
    if code in (80, 81, 82, 95, 96, 99):
        return "4"
    if code in (51, 53, 55, 56, 57, 61, 63, 65):
        return "1"
    return "0"


def _pcp_label(mm):
    if not mm:
        return "강수없음"
    if mm < 1:
        return "1mm 미만"
    return f"{mm:.1f}mm"


def fetch_open_meteo(parks: list) -> list:
    params = {
        "latitude": ",".join(str(p["lat"]) for p in parks),
        "longitude": ",".join(str(p["lon"]) for p in parks),
        "hourly": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "cloud_cover",
            "wind_speed_10m",
        ]),
        "wind_speed_unit": "ms",
        "timezone": "Asia/Seoul",
        "forecast_days": 4,
    }
    resp = requests.get(OPEN_METEO_URL, params=params, timeout=20)
    resp.raise_for_status()
    payload = resp.json()
    if isinstance(payload, dict):
        payload = [payload]

    results = []
    for loc in payload:
        h = loc["hourly"]
        by_date: dict[str, dict[str, dict]] = {}
        for i, ts in enumerate(h["time"]):
            date_part, time_part = ts.split("T")
            fcst_date = date_part.replace("-", "")
            fcst_time = time_part.replace(":", "")[:4]

            def val(key):
                arr = h.get(key) or []
                return arr[i] if i < len(arr) else None

            temp = val("temperature_2m")
            by_date.setdefault(fcst_date, {})[fcst_time] = {
                "TMP": f"{round(temp)}" if temp is not None else "",
                "SKY": _sky_from_cloud(val("cloud_cover")),
                "PTY": _pty_from_wmo(val("weather_code")),
                "POP": f"{val('precipitation_probability') or 0}",
                "PCP": _pcp_label(val("precipitation")),
                "REH": f"{val('relative_humidity_2m') or 0}",
                "WSD": f"{val('wind_speed_10m') or 0:.1f}",
            }
        results.append(by_date)
    return results


def trim_past(by_date: dict, now: datetime) -> dict:
    """오늘 0시 이전 데이터는 버린다."""
    today = now.strftime("%Y%m%d")
    return {d: slots for d, slots in sorted(by_date.items()) if d >= today}


def load_previous() -> dict:
    if not os.path.exists(OUTPUT_PATH):
        return {}
    try:
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            prev = json.load(f)
        return {p["stadium"]: p for p in prev.get("data", []) if p.get("forecastsByDate")}
    except (OSError, ValueError, KeyError):
        return {}


def main() -> int:
    with open("ballparkLocations.json", encoding="utf-8") as f:
        ballparks = json.load(f)

    now = datetime.now(KST)
    base_date, base_time = get_base_datetime(now)
    print(f"🕒 기준 발표: {base_date} {base_time} KST (현재 {now:%Y-%m-%d %H:%M} KST)")

    per_park: dict[str, tuple[str, dict]] = {}

    if API_KEY:
        for park in ballparks:
            for attempt in range(1, 3):
                try:
                    per_park[park["stadium"]] = ("kma", fetch_kma(park, base_date, base_time))
                    print(f"✅ KMA: {park['stadium']}")
                    break
                except Exception as e:  # noqa: BLE001
                    print(f"❌ KMA 실패({attempt}/2): {park['stadium']} / {e}")
                    time.sleep(1)
    else:
        print("ℹ️ GOKR_WEATHER_API_KEY 없음 → Open-Meteo 사용")

    missing = [p for p in ballparks if p["stadium"] not in per_park]
    if missing:
        try:
            for park, by_date in zip(missing, fetch_open_meteo(missing)):
                per_park[park["stadium"]] = ("open-meteo", by_date)
                print(f"✅ Open-Meteo: {park['stadium']}")
        except Exception as e:  # noqa: BLE001
            print(f"❌ Open-Meteo 실패: {e}")

    previous = load_previous()
    today = now.strftime("%Y%m%d")
    results = []
    for park in ballparks:
        if park["stadium"] in per_park:
            source, by_date = per_park[park["stadium"]]
            by_date = trim_past(by_date, now)
        elif park["stadium"] in previous:
            prev = previous[park["stadium"]]
            source = prev.get("source", "previous") + "(stale)"
            by_date = trim_past(prev["forecastsByDate"], now)
            print(f"↩️ 이전 데이터 사용: {park['stadium']}")
        else:
            print(f"⚠️ 데이터 없음: {park['stadium']}")
            continue

        results.append({
            "team": park["team"],
            "stadium": park["stadium"],
            "location": {"nx": park["nx"], "ny": park["ny"]},
            "source": source,
            "forecastsByDate": by_date,
            # 구버전 앱 호환용: 오늘 예보만
            "forecasts": by_date.get(today, {}),
        })

    fresh = sum(1 for r in results if "stale" not in r["source"])
    if fresh == 0:
        print("❌ 모든 구장 예보 수집 실패 — 기존 파일을 유지합니다.")
        return 1

    output = {
        "updatedAt": now.isoformat(timespec="seconds"),
        "baseDate": base_date,
        "baseTime": base_time,
        "data": results,
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"💾 {len(results)}개 구장 저장 (신규 {fresh})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
