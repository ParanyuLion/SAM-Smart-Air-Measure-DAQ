from pathlib import Path
import numpy as np
import joblib
from fastapi import APIRouter
from pydantic import BaseModel
from database import get_latest_sensor_row, get_actual_aqi_near_ts

router = APIRouter()

MODEL_PATH = Path(__file__).parent.parent / "models" / "rf_model.pkl"

_model = None
try:
    _model = joblib.load(MODEL_PATH)
    print(f"[predict] Model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"[predict] Failed to load model: {e}")

PLACE_ENC = {"inside": 0, "outdoor": 1}

DEFAULTS = {
    "temp": 28.0,
    "humidity": 60,
    "gas_co": 280,
    "temp_tmd": 32.0,
    "humidity_tmd": 65.0,
    "rainfall_tmd": 0.0,
    "place_enc": "inside",
    "pm25": 15,
    "pm10": 12,
    "place": "inside",
    "ts": None,
    "actual_aqi": None,
    "actual_ts": None,
}


@router.get("/predict/latest")
async def get_latest():
    row = get_latest_sensor_row()
    if row is None:
        return DEFAULTS

    ts = row.get("ts")

    # Look up the closest non-null pm25_aqi by timestamp
    actual_row = get_actual_aqi_near_ts(ts) if ts is not None else None

    return {
        "temp": float(row.get("temp", DEFAULTS["temp"])),
        "humidity": int(row.get("humidity", DEFAULTS["humidity"])),
        "gas_co": int(row.get("gas_co", DEFAULTS["gas_co"])),
        "temp_tmd": float(row.get("temp_tmd", DEFAULTS["temp_tmd"])),
        "humidity_tmd": float(row.get("humidity_tmd", DEFAULTS["humidity_tmd"])),
        "rainfall_tmd": float(row.get("rainfall_tmd", DEFAULTS["rainfall_tmd"])),
        "place_enc": str(row.get("place", DEFAULTS["place"])),
        "pm25": int(row.get("pm25", DEFAULTS["pm25"])),
        "pm10": int(row.get("pm10", DEFAULTS["pm10"])),
        "place": str(row.get("place", DEFAULTS["place"])),
        "ts": str(ts) if ts is not None else None,
        "actual_aqi": int(actual_row["pm25"]) if actual_row else None,
        "actual_ts": str(actual_row["ts"]) if actual_row else None,
    }


class PredictRequest(BaseModel):
    temp: float
    humidity: float
    gas_co: float
    temp_tmd: float
    humidity_tmd: float
    rainfall_tmd: float
    place_enc: str  # "inside" or "outdoor"
    pm25: float
    pm10: float


@router.post("/predict")
async def predict(req: PredictRequest):
    place_int = PLACE_ENC.get(req.place_enc, 0)
    features = np.array([[
        req.temp, req.humidity, req.gas_co,
        req.temp_tmd, req.humidity_tmd, req.rainfall_tmd,
        place_int, req.pm25, req.pm10,
    ]])
    pm25_aqi = int(round(float(_model.predict(features)[0])))
    return {"pm25_aqi": pm25_aqi, "place": req.place_enc}
