# PM2.5 Prediction Page — Design Spec

**Date:** 2026-04-11  
**Branch:** feature/data-analytics  
**Status:** Approved

---

## Overview

Add a `/predict` page to the SAM web app that exposes the trained Random Forest model for PM2.5 AQI prediction. Users can view the latest sensor readings fetched live from the database, optionally edit them, and get an instant AQI prediction with a color-coded health status.

---

## Architecture

Four areas of change. All other files untouched.

```
analysis/
  save_model.py              ← NEW: one-time training script

backend/
  models/rf_model.pkl        ← NEW: generated artifact (git-ignored)
  static/
    feature_importance.png   ← NEW: copied from analysis/output/
  routers/predict.py         ← NEW: prediction endpoints
  main.py                    ← EDIT: CORS, static mount, router registration
  database.py                ← EDIT: add get_latest_sensor_row()

frontend/src/app/
  predict/page.tsx           ← NEW: client component
  layout.tsx                 ← EDIT: add "Predict" nav link
```

---

## Model

- **Algorithm:** `RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)`
- **Target:** `pm25_aqi`
- **Features (order is fixed — must match training):**

| # | Feature | Source |
|---|---------|--------|
| 1 | `temp` | KidBright sensor |
| 2 | `humidity` | KidBright sensor |
| 3 | `gas_co` | KidBright sensor |
| 4 | `temp_tmd` | TMD weather |
| 5 | `humidity_tmd` | TMD weather |
| 6 | `rainfall_tmd` | TMD weather |
| 7 | `place_enc` | Derived from `place` (0=inside, 1=outdoor) |
| 8 | `pm25` | KidBright sensor |
| 9 | `pm10` | KidBright sensor |

- **`place` values:** `"inside"` / `"outdoor"` (from `sensor_data` table)
- **`place_enc` mapping:** `LabelEncoder` alphabetical — `inside=0`, `outdoor=1`
- **Training data:** `analysis/output/integrated_air_quality_data.csv` (609 rows, no nulls)
- **Performance:** Mean R² = 0.8554, Mean RMSE = 7.10 (5-fold CV)

---

## Backend

### `analysis/save_model.py`

Run once before starting the server. Steps:
1. Load `analysis/output/integrated_air_quality_data.csv`
2. Apply `LabelEncoder` to `place` column → `place_enc`
3. Select `FEATURE_COLS` in fixed order, drop nulls
4. Train `RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)` on full dataset
5. `joblib.dump(rf_model, "backend/models/rf_model.pkl")`
6. Copy `analysis/output/feature_importance.png` → `backend/static/feature_importance.png`

### `backend/routers/predict.py`

Model loaded once at module import (`joblib.load`) — not per-request.

**`GET /api/predict/latest`**
- Calls `get_latest_sensor_row()` from `database.py`
- Returns the 9 feature values as floats/ints plus the raw `place` string
- If DB is unavailable: returns hardcoded realistic defaults below (graceful fallback — consistent with existing pattern):
  `{ temp: 28.0, humidity: 60, gas_co: 280, temp_tmd: 32.0, humidity_tmd: 65.0, rainfall_tmd: 0.0, place_enc: "inside", pm25: 15, pm10: 12, place: "inside" }`

**`POST /api/predict`**
- Accepts `PredictRequest` Pydantic model: 9 fields, with `place_enc` as `str` (`"inside"` or `"outdoor"`)
- Backend maps `place_enc` string → int (0 or 1) before building the feature array
- Returns `{ "pm25_aqi": <int>, "place": "<str>" }`

### `backend/main.py` changes

- Add `"POST"` to `allow_methods` in CORS middleware
- Mount `StaticFiles(directory="static")` at `/static`
- Register `predict.router` with prefix `/api`, tag `"Predict"`

### `backend/database.py` change

Add `get_latest_sensor_row()`:
- `SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1`
- Returns a dict of column values, or `None` on failure
- Wrapped in same try/except pattern as `get_db_stats()`

### `backend/requirements.txt` additions

```
scikit-learn>=1.4.0
joblib>=1.3.0
```

---

## Frontend — `/predict` page

**Type:** Client component (`"use client"`)

### Modes

| Mode | Trigger | Behavior |
|------|---------|---------|
| **Live** | Default on page load | Fetches `GET /api/predict/latest`; feature values shown in read-only table; "Refresh" button re-fetches |
| **Edit** | "Edit Values" button | Same table becomes editable inputs; `place_enc` shown as dropdown (`Inside` / `Outdoor`); numeric fields are `<input type="number">` |

Both modes share a single "Predict" button that POSTs to `/api/predict`.

### Layout (top → bottom)

1. **Page header** — title + mode toggle button ("Edit Values" / "Use Live Data")
2. **Input panel** (`.glass-panel`) — feature table, Refresh button (Live mode only), Predict button
3. **Result panel** (`.glass-panel`) — shown after first prediction:
   - Large `pm25_aqi` number
   - Background color from AQI_LEVELS scale (same 6-level logic as `features/page.tsx`)
   - Health status label (e.g. "Moderate")
   - Indoor / Outdoor badge
4. **Feature Importance panel** (`.glass-panel`) — `<img>` from `http://localhost:8000/static/feature_importance.png`

### AQI Color Scale

Reuses the same 6-level US EPA scale already defined in `features/page.tsx`:

| Level | Range | Color |
|-------|-------|-------|
| Good | 0–50 | `#16a34a` |
| Moderate | 51–100 | `#ca8a04` |
| Unhealthy for Sensitive | 101–150 | `#ea580c` |
| Unhealthy | 151–200 | `#dc2626` |
| Very Unhealthy | 201–300 | `#7c3aed` |
| Hazardous | 301–500 | `#991b1b` |

### Styling conventions

- `.glass-panel` for all cards
- CSS vars (`var(--primary)`, `var(--surface)`, etc.) for all colors except AQI level colors
- Inline styles for one-off spacing/positioning
- No new global CSS classes added
- No external libraries

### `layout.tsx` change

Add `<a href="/predict">Predict</a>` to the nav alongside existing links.

---

## Data Flow

```
User loads /predict
  → GET /api/predict/latest
      → database.get_latest_sensor_row()
      → { temp, humidity, gas_co, temp_tmd, humidity_tmd, rainfall_tmd, place_enc, pm25, pm10, place }
  → Feature table rendered (read-only, Live mode)

User clicks "Predict"
  → POST /api/predict  { temp, humidity, gas_co, temp_tmd, humidity_tmd, rainfall_tmd, place_enc:"inside"|"outdoor", pm25, pm10 }
      → backend maps place_enc string → int
      → rf_model.predict([[...9 features...]])
      → { pm25_aqi: 72, place: "inside" }
  → Result panel shown with color + badge
```

---

## Run Order

1. `cd analysis && python save_model.py` — generates `backend/models/rf_model.pkl` and `backend/static/feature_importance.png`
2. `cd backend && uvicorn main:app --reload` — serves the API including `/api/predict`
3. `cd frontend && npm run dev` — serves the Next.js app at `:3000`

---

## Out of Scope

- Real-time auto-refresh (polling)
- Saving predictions to the database
- Model retraining via the UI
- Unit tests (no test framework configured per CLAUDE.md)
