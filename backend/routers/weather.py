import httpx
from fastapi import APIRouter, Query, HTTPException
from cachetools import TTLCache

router = APIRouter()

_cache: TTLCache = TTLCache(maxsize=100, ttl=900)  # 15 minutes


@router.get("/weather")
async def get_weather(
    lat: float = Query(default=13.754),
    lon: float = Query(default=100.5014),
    timezone: str = Query(default="Asia/Bangkok"),
):
    cache_key = f"{lat},{lon},{timezone}"
    if cache_key in _cache:
        return _cache[cache_key]

    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": timezone,
        "forecast_days": 7,
        "current": "temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m,wind_direction_10m",
        "daily": "weather_code,temperature_2m_min,temperature_2m_max,wind_speed_10m_max,precipitation_probability_max,precipitation_sum,uv_index_max,wind_direction_10m_dominant",
        "hourly": "temperature_2m,relative_humidity_2m,rain,wind_speed_10m,wind_direction_10m",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get("https://api.open-meteo.com/v1/forecast", params=params)

    if not res.is_success:
        raise HTTPException(status_code=502, detail="Failed to fetch weather data from Open-Meteo")

    data = res.json()
    _cache[cache_key] = data
    return data
