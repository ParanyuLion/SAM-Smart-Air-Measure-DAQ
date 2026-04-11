# PM2.5 Prediction Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/predict` page that loads the latest sensor reading from the DB, lets the user edit values, and returns a color-coded PM2.5 AQI prediction from a trained Random Forest model.

**Architecture:** A one-time Python script trains the RF model and saves `rf_model.pkl` + `feature_importance.png` into the backend. A new FastAPI router loads the model once at startup and exposes `GET /api/predict/latest` + `POST /api/predict`. A new Next.js client component at `/predict` fetches live data, toggles to edit mode, and renders the result with AQI color coding.

**Tech Stack:** Python 3.11+, scikit-learn, joblib, FastAPI `StaticFiles`, Next.js App Router, TypeScript, vanilla CSS

---

## Prerequisites

Before running any task, ensure the notebook has been run at least through cell 13 so that `analysis/output/feature_importance.png` exists. If it doesn't:

```bash
cd analysis
jupyter nbconvert --to notebook --execute random_forest_pm25.ipynb --output random_forest_pm25.ipynb
```

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `analysis/save_model.py` | Create | Train RF on full dataset, dump `rf_model.pkl`, copy PNG |
| `backend/models/rf_model.pkl` | Generated | Serialized model (git-ignored) |
| `backend/static/feature_importance.png` | Generated | Static image served by FastAPI (git-ignored) |
| `backend/.gitignore` | Modify | Ignore `models/` and `static/` directories |
| `backend/requirements.txt` | Modify | Add `scikit-learn>=1.4.0` and `joblib>=1.3.0` |
| `backend/database.py` | Modify | Add `get_latest_sensor_row()` |
| `backend/routers/predict.py` | Create | `GET /api/predict/latest` + `POST /api/predict` |
| `backend/main.py` | Modify | Add POST to CORS, mount `/static`, register predict router |
| `frontend/src/app/predict/page.tsx` | Create | Client component — live/edit modes + result display |
| `frontend/src/app/layout.tsx` | Modify | Add "Predict" nav link |

---

## Task 1: Model serialization script

**Files:**
- Create: `analysis/save_model.py`

- [ ] **Step 1: Create `analysis/save_model.py`**

```python
import os
import shutil
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

RANDOM_STATE = 42
FEATURE_COLS = [
    'temp', 'humidity', 'gas_co',
    'temp_tmd', 'humidity_tmd', 'rainfall_tmd',
    'place_enc', 'pm25', 'pm10',
]
TARGET = 'pm25_aqi'

df = pd.read_csv('output/integrated_air_quality_data.csv', parse_dates=['ts'])

le = LabelEncoder()
df['place_enc'] = le.fit_transform(df['place'].astype(str))
print('Label encoding:', dict(zip(le.classes_, le.transform(le.classes_))))
# Expected: {'inside': 0, 'outdoor': 1}

data = df[FEATURE_COLS + [TARGET]].dropna()
X = data[FEATURE_COLS]
y = data[TARGET]
print(f'Training on {len(data)} rows, {len(FEATURE_COLS)} features')

rf_model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=RANDOM_STATE)
rf_model.fit(X, y)
print(f'Training R2 (full dataset): {rf_model.score(X, y):.4f}')

os.makedirs('../backend/models', exist_ok=True)
joblib.dump(rf_model, '../backend/models/rf_model.pkl')
print('Saved -> ../backend/models/rf_model.pkl')

os.makedirs('../backend/static', exist_ok=True)
shutil.copy('output/feature_importance.png', '../backend/static/feature_importance.png')
print('Copied -> ../backend/static/feature_importance.png')
```

- [ ] **Step 2: Run the script from the `analysis/` directory**

```bash
cd analysis
python save_model.py
```

Expected output:
```
Label encoding: {'inside': 0, 'outdoor': 1}
Training on 609 rows, 9 features
Training R2 (full dataset): 0.9...
Saved -> ../backend/models/rf_model.pkl
Copied -> ../backend/static/feature_importance.png
```

- [ ] **Step 3: Verify both files were created**

```bash
ls ../backend/models/rf_model.pkl
ls ../backend/static/feature_importance.png
```

Both should exist. If either is missing, check that `analysis/output/` contains the CSV and PNG.

- [ ] **Step 4: Commit**

```bash
cd ..
git add analysis/save_model.py
git commit -m "feat: add model serialization script"
```

---

## Task 2: Backend gitignore + dependencies

**Files:**
- Modify: `backend/.gitignore`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add generated directories to `.gitignore`**

In `backend/.gitignore`, append at the end:

```gitignore

# ML model artifacts
models/
static/
```

- [ ] **Step 2: Add ML dependencies to `requirements.txt`**

Replace the contents of `backend/requirements.txt` with:

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
httpx>=0.27.0
sqlalchemy>=2.0.0
pymysql>=1.1.0
python-dotenv>=1.0.0
cachetools>=5.3.0
scikit-learn>=1.4.0
joblib>=1.3.0
```

- [ ] **Step 3: Install updated requirements**

```bash
cd backend
pip install -r requirements.txt
```

Expected: scikit-learn and joblib install (or report "already satisfied").

- [ ] **Step 4: Commit**

```bash
git add backend/.gitignore backend/requirements.txt
git commit -m "chore: add scikit-learn and joblib, gitignore model artifacts"
```

---

## Task 3: Database helper — `get_latest_sensor_row`

**Files:**
- Modify: `backend/database.py`

- [ ] **Step 1: Add `get_latest_sensor_row()` to `database.py`**

Append this function after `get_db_stats()` (line 50):

```python
def get_latest_sensor_row() -> dict | None:
    if _engine is None:
        return None
    try:
        with _engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1")
            ).mappings().first()
            return dict(row) if row else None
    except SQLAlchemyError:
        return None
```

The full `database.py` should now end with:

```python
def get_latest_sensor_row() -> dict | None:
    if _engine is None:
        return None
    try:
        with _engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1")
            ).mappings().first()
            return dict(row) if row else None
    except SQLAlchemyError:
        return None
```

- [ ] **Step 2: Commit**

```bash
git add backend/database.py
git commit -m "feat: add get_latest_sensor_row to database.py"
```

---

## Task 4: Predict router

**Files:**
- Create: `backend/routers/predict.py`

- [ ] **Step 1: Create `backend/routers/predict.py`**

```python
from pathlib import Path
import numpy as np
import joblib
from fastapi import APIRouter
from pydantic import BaseModel
from database import get_latest_sensor_row

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
}


@router.get("/predict/latest")
async def get_latest():
    row = get_latest_sensor_row()
    if row is None:
        return DEFAULTS
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/predict.py
git commit -m "feat: add predict router with /api/predict/latest and /api/predict"
```

---

## Task 5: Wire up the backend

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Replace `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import aqi, weather, location, dashboard, predict

app = FastAPI(title="SAM — Smart Air Measure API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(aqi.router, prefix="/api", tags=["AQI"])
app.include_router(weather.router, prefix="/api", tags=["Weather"])
app.include_router(location.router, prefix="/api", tags=["Location"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(predict.router, prefix="/api", tags=["Predict"])


@app.get("/")
def root():
    return {"message": "SAM API is running", "docs": "/docs"}
```

- [ ] **Step 2: Start the backend and verify**

```bash
cd backend
uvicorn main:app --reload
```

Expected startup output includes:
```
[predict] Model loaded from .../backend/models/rf_model.pkl
```

Open `http://localhost:8000/docs` in a browser. You should see the `Predict` tag with two endpoints: `GET /api/predict/latest` and `POST /api/predict`.

- [ ] **Step 3: Smoke-test the endpoints manually**

In the Swagger UI at `http://localhost:8000/docs`:

1. Try `GET /api/predict/latest` — should return a JSON object with the 9 feature keys plus `place`.
2. Try `POST /api/predict` with this body:
```json
{
  "temp": 28.0,
  "humidity": 60,
  "gas_co": 280,
  "temp_tmd": 32.0,
  "humidity_tmd": 65.0,
  "rainfall_tmd": 0.0,
  "place_enc": "inside",
  "pm25": 15,
  "pm10": 12
}
```
Expected response: `{ "pm25_aqi": <some integer>, "place": "inside" }`

Also verify the static file: open `http://localhost:8000/static/feature_importance.png` — should display the chart.

- [ ] **Step 4: Commit**

```bash
git add backend/main.py
git commit -m "feat: wire up predict router, static files, POST CORS"
```

---

## Task 6: Frontend predict page

**Files:**
- Create: `frontend/src/app/predict/page.tsx`

- [ ] **Step 1: Create `frontend/src/app/predict/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface FeatureValues {
  temp: number;
  humidity: number;
  gas_co: number;
  temp_tmd: number;
  humidity_tmd: number;
  rainfall_tmd: number;
  place_enc: string;
  pm25: number;
  pm10: number;
  place: string;
}

interface PredictResult {
  pm25_aqi: number;
  place: string;
}

interface AqiLevel {
  label: string;
  color: string;
  bg: string;
  min: number;
  max: number;
}

const AQI_LEVELS: AqiLevel[] = [
  { label: "Good",                    color: "#16a34a", bg: "rgba(22,163,74,0.12)",   min: 0,   max: 50  },
  { label: "Moderate",                color: "#ca8a04", bg: "rgba(202,138,4,0.12)",   min: 51,  max: 100 },
  { label: "Unhealthy for Sensitive", color: "#ea580c", bg: "rgba(234,88,12,0.12)",   min: 101, max: 150 },
  { label: "Unhealthy",               color: "#dc2626", bg: "rgba(220,38,38,0.12)",   min: 151, max: 200 },
  { label: "Very Unhealthy",          color: "#7c3aed", bg: "rgba(124,58,237,0.12)",  min: 201, max: 300 },
  { label: "Hazardous",               color: "#991b1b", bg: "rgba(153,27,27,0.18)",   min: 301, max: 500 },
];

function getAqiLevel(aqi: number): AqiLevel {
  return AQI_LEVELS.find((l) => aqi >= l.min && aqi <= l.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
}

type NumericFeatureKey = Exclude<keyof FeatureValues, "place_enc" | "place">;

const FEATURE_ROWS: { key: NumericFeatureKey | "place_enc"; label: string; unit: string; step: string }[] = [
  { key: "temp",          label: "Temperature (sensor)",  unit: "°C",    step: "0.1" },
  { key: "humidity",      label: "Humidity (sensor)",     unit: "%",     step: "1"   },
  { key: "gas_co",        label: "CO Gas",                unit: "ppm",   step: "1"   },
  { key: "temp_tmd",      label: "Temperature (TMD)",     unit: "°C",    step: "0.1" },
  { key: "humidity_tmd",  label: "Humidity (TMD)",        unit: "%",     step: "0.1" },
  { key: "rainfall_tmd",  label: "Rainfall (TMD)",        unit: "mm",    step: "0.1" },
  { key: "place_enc",     label: "Location",              unit: "",      step: ""    },
  { key: "pm25",          label: "PM2.5 (sensor)",        unit: "µg/m³", step: "1"   },
  { key: "pm10",          label: "PM10 (sensor)",         unit: "µg/m³", step: "1"   },
];

export default function PredictPage() {
  const [mode, setMode] = useState<"live" | "edit">("live");
  const [features, setFeatures] = useState<FeatureValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/predict/latest`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeatureValues = await res.json();
      setFeatures(data);
    } catch {
      setError("Could not fetch latest sensor data. Showing defaults.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLatest(); }, []);

  const handlePredict = async () => {
    if (!features) return;
    setPredicting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp: features.temp,
          humidity: features.humidity,
          gas_co: features.gas_co,
          temp_tmd: features.temp_tmd,
          humidity_tmd: features.humidity_tmd,
          rainfall_tmd: features.rainfall_tmd,
          place_enc: features.place_enc,
          pm25: features.pm25,
          pm10: features.pm10,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PredictResult = await res.json();
      setResult(data);
    } catch {
      setError("Prediction failed. Is the backend running?");
    } finally {
      setPredicting(false);
    }
  };

  const handleNumberChange = (key: NumericFeatureKey, value: string) => {
    if (!features) return;
    setFeatures({ ...features, [key]: parseFloat(value) || 0 });
  };

  const handlePlaceChange = (value: string) => {
    if (!features) return;
    setFeatures({ ...features, place_enc: value, place: value });
  };

  const toggleMode = () => {
    if (mode === "edit") {
      fetchLatest();
    }
    setMode((m) => (m === "live" ? "edit" : "live"));
  };

  return (
    <div className="container fade-in-up" style={{ padding: "2rem 1rem", maxWidth: "860px" }}>

      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            <span className="text-gradient">PM2.5 AQI</span> Prediction
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Random Forest · R² = 0.86 · 9 features
          </p>
        </div>
        <button className="btn btn-secondary" onClick={toggleMode}>
          {mode === "live" ? "Edit Values" : "Use Live Data"}
        </button>
      </div>

      {/* Input Panel */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="flex justify-between items-center" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
            {mode === "live" ? "Latest Sensor Reading" : "Manual Input"}
          </h2>
          {mode === "live" && (
            <button
              className="btn btn-secondary"
              onClick={fetchLatest}
              disabled={loading}
              style={{ fontSize: "0.85rem", padding: "0.35rem 0.85rem" }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>

        {features ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left",  padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Feature</th>
                <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Value</th>
                <th style={{ textAlign: "left",  padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map(({ key, label, unit, step }) => (
                <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{label}</td>
                  <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                    {mode === "edit" ? (
                      key === "place_enc" ? (
                        <select
                          value={features.place_enc}
                          onChange={(e) => handlePlaceChange(e.target.value)}
                          style={{
                            background: "var(--surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            padding: "0.2rem 0.4rem",
                          }}
                        >
                          <option value="inside">Inside</option>
                          <option value="outdoor">Outdoor</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          step={step}
                          value={features[key] as number}
                          onChange={(e) => handleNumberChange(key as NumericFeatureKey, e.target.value)}
                          style={{
                            width: "90px",
                            textAlign: "right",
                            background: "var(--surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            padding: "0.2rem 0.4rem",
                          }}
                        />
                      )
                    ) : (
                      key === "place_enc" ? (
                        <span style={{ fontWeight: 600 }}>
                          {features.place_enc === "inside" ? "Inside" : "Outdoor"}
                        </span>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{features[key] as number}</span>
                      )
                    )}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-secondary)" }}>{unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-secondary)" }}>
            {loading ? "Loading sensor data..." : "No data available."}
          </p>
        )}

        {error && (
          <p style={{ color: "#dc2626", marginTop: "0.75rem", fontSize: "0.9rem" }}>{error}</p>
        )}

        <div style={{ marginTop: "1.25rem" }}>
          <button
            className="btn btn-primary"
            onClick={handlePredict}
            disabled={!features || predicting}
            style={{ minWidth: "140px" }}
          >
            {predicting ? "Predicting..." : "Predict AQI"}
          </button>
        </div>
      </div>

      {/* Result Panel */}
      {result && (() => {
        const level = getAqiLevel(result.pm25_aqi);
        return (
          <div
            className="glass-panel"
            style={{ padding: "1.5rem", marginBottom: "1.5rem", borderLeft: `4px solid ${level.color}` }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Prediction Result</h2>
            <div className="flex items-center" style={{ gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3.5rem", fontWeight: 800, color: level.color, lineHeight: 1 }}>
                  {result.pm25_aqi}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  PM2.5 AQI
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    background: level.bg,
                    color: level.color,
                    border: `1px solid ${level.color}`,
                    borderRadius: "6px",
                    padding: "0.3rem 0.75rem",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  {level.label}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {result.place === "inside" ? "Indoor" : "Outdoor"}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Feature Importance */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Feature Importance</h2>
        <img
          src={`${API}/static/feature_importance.png`}
          alt="Feature importance chart for PM2.5 prediction model"
          style={{ width: "100%", borderRadius: "8px" }}
        />
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

With both backend (`uvicorn main:app --reload`) and frontend (`npm run dev`) running:

Open `http://localhost:3000/predict` in a browser.

Expected:
- Page loads with a table of 9 feature values (fetched from DB or defaults)
- "Edit Values" button is visible
- Feature importance chart displays at the bottom

- [ ] **Step 3: Test the predict flow**

1. Click "Predict AQI" — a result panel should appear with a colored AQI number, health status label, and Indoor/Outdoor badge.
2. Click "Edit Values", change `pm25` to `80`, click "Predict AQI" — AQI result should change.
3. Click "Use Live Data" — table resets to DB values.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/predict/page.tsx
git commit -m "feat: add /predict page with live/edit modes and AQI result display"
```

---

## Task 7: Add nav link

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add "Predict" link to the nav in `layout.tsx`**

Find this line (line 31):
```tsx
<Link href="/dashboard" className="btn btn-primary">Sensor Data Analytics</Link>
```

Replace that `<nav>` block with:
```tsx
<nav className="flex gap-4">
  <Link href="/features" className="btn btn-secondary">Weather & AQI</Link>
  <Link href="/predict" className="btn btn-secondary">Predict</Link>
  <Link href="/dashboard" className="btn btn-primary">Sensor Data Analytics</Link>
</nav>
```

- [ ] **Step 2: Verify nav link**

Reload `http://localhost:3000`. The header should now show three nav buttons: "Weather & AQI", "Predict", "Sensor Data Analytics". Clicking "Predict" navigates to `/predict`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat: add Predict nav link to layout"
```

---

## Run Order Summary

```bash
# 1. Generate model (once, from analysis/ dir)
cd analysis
python save_model.py

# 2. Start backend
cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Start frontend (separate terminal)
cd ../frontend
npm run dev
```

Then open `http://localhost:3000/predict`.
