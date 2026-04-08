import os
import httpx
from fastapi import APIRouter, Query, HTTPException
from cachetools import TTLCache

router = APIRouter()

AQICN_TOKEN = os.getenv("AQICN_TOKEN", "b8a6d8e234e1e18cbcf2a034e24958eca5aab2c3")
_cache: TTLCache = TTLCache(maxsize=100, ttl=600)  # 10 minutes


@router.get("/aqi")
async def get_aqi(
    lat: float = Query(default=13.75),
    lng: float = Query(default=100.5),
):
    cache_key = f"{lat},{lng}"
    if cache_key in _cache:
        return _cache[cache_key]

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            f"https://api.waqi.info/feed/geo:{lat};{lng}/?token={AQICN_TOKEN}"
        )

    if not res.is_success:
        raise HTTPException(status_code=502, detail="Failed to fetch AQI data from AQICN")

    data = res.json()
    if data.get("status") != "ok":
        raise HTTPException(status_code=502, detail=data.get("data", "AQICN returned an error"))

    _cache[cache_key] = data
    return data
