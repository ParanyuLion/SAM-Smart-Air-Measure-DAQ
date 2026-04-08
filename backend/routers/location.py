import httpx
from fastapi import APIRouter, HTTPException, Request
from cachetools import TTLCache

router = APIRouter()

_cache: TTLCache = TTLCache(maxsize=500, ttl=3600)  # 1 hour

_PRIVATE_PREFIXES = ("127.", "::1", "192.168.", "10.", "172.")


def _is_private(ip: str) -> bool:
    return any(ip.startswith(p) for p in _PRIVATE_PREFIXES)


@router.get("/location")
async def get_location(request: Request):
    # Resolve client IP — honour X-Forwarded-For when behind a proxy
    forwarded = request.headers.get("x-forwarded-for")
    client_ip = (forwarded.split(",")[0].strip() if forwarded else None) or (
        request.client.host if request.client else None
    )

    if client_ip and not _is_private(client_ip):
        cache_key = client_ip
        url = f"http://ip-api.com/json/{client_ip}?fields=lat,lon,city,regionName,country,timezone"
    else:
        # Fallback: let ip-api detect server IP (same behaviour as original Next.js code)
        cache_key = "server"
        url = "http://ip-api.com/json/?fields=lat,lon,city,regionName,country,timezone"

    if cache_key in _cache:
        return _cache[cache_key]

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url)

    if not res.is_success:
        raise HTTPException(status_code=502, detail="Failed to determine location")

    data = res.json()
    _cache[cache_key] = data
    return data
