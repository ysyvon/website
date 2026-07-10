#!/usr/bin/env python3
"""Fetch no-key marine data and write marine-data.json for the canvas piece."""

from __future__ import annotations

import json
import math
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_LATITUDE = 40.25
DEFAULT_LONGITUDE = -73.35
OUTPUT = Path(__file__).with_name("marine-data.json")


def nearest_current(values: dict) -> dict:
    current = values.get("current", {})
    if current:
        return current

    hourly = values.get("hourly", {})
    times = hourly.get("time", [])
    if not times:
        return {}

    now = datetime.now(timezone.utc)
    best_index = 0
    best_distance = math.inf
    for index, stamp in enumerate(times):
        try:
            parsed = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        distance = abs((parsed - now).total_seconds())
        if distance < best_distance:
            best_distance = distance
            best_index = index

    result = {"time": times[best_index]}
    for key, series in hourly.items():
        if key != "time" and isinstance(series, list) and best_index < len(series):
            result[key] = series[best_index]
    return result


def number(value, fallback=0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except (TypeError, ValueError):
        return fallback


def fetch(latitude: float, longitude: float) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join(
            [
                "wave_height",
                "wave_period",
                "sea_level_height_msl",
                "sea_surface_temperature",
                "ocean_current_velocity",
                "ocean_current_direction",
            ]
        ),
        "hourly": ",".join(
            [
                "wave_height",
                "wave_period",
                "sea_level_height_msl",
                "sea_surface_temperature",
                "ocean_current_velocity",
                "ocean_current_direction",
            ]
        ),
        "forecast_hours": 6,
        "timezone": "UTC",
        "cell_selection": "sea",
    }
    url = "https://marine-api.open-meteo.com/v1/marine?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    current = nearest_current(payload)
    return {
        "loaded": True,
        "source": "Open-Meteo Marine API",
        "apiUrl": url,
        "updated": datetime.now(timezone.utc).isoformat(),
        "time": current.get("time", ""),
        "latitude": payload.get("latitude", latitude),
        "longitude": payload.get("longitude", longitude),
        "waveHeight": number(current.get("wave_height"), 1.1),
        "wavePeriod": number(current.get("wave_period"), 7.5),
        "seaLevel": number(current.get("sea_level_height_msl"), 0.0),
        "seaSurfaceTemperature": number(current.get("sea_surface_temperature"), 14.0),
        "currentVelocity": number(current.get("ocean_current_velocity"), 0.18),
        "currentDirection": number(current.get("ocean_current_direction"), 90.0),
    }


def main() -> int:
    latitude = float(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_LATITUDE
    longitude = float(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_LONGITUDE

    try:
        data = fetch(latitude, longitude)
    except Exception as error:
        if OUTPUT.exists():
            print(f"Fetch failed, keeping existing {OUTPUT.name}: {error}", file=sys.stderr)
            return 0
        data = {
            "loaded": False,
            "source": "fallback",
            "updated": datetime.now(timezone.utc).isoformat(),
            "time": "",
            "latitude": latitude,
            "longitude": longitude,
            "waveHeight": 1.1,
            "wavePeriod": 7.5,
            "seaLevel": 0.0,
            "seaSurfaceTemperature": 14.0,
            "currentVelocity": 0.18,
            "currentDirection": 90.0,
            "error": str(error),
        }

    OUTPUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT}")
    time.sleep(0.05)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
