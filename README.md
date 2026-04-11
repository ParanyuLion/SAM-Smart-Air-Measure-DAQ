# SAM — Smart Air Measure

Real-time air quality monitoring, analytics, and ML-powered PM2.5 AQI prediction. A **Next.js** frontend displays live AQI, weather data, and model predictions fetched through a **FastAPI** backend, which also queries an optional MySQL sensor database.

## Features

- **Air Quality Analytics** — Real-time AQI from [aqicn.org](https://aqicn.org/) with US EPA color-coded levels (Good → Hazardous)
- **Weather Forecast** — 7-day forecast via [Open-Meteo](https://open-meteo.com/) with WMO weather codes
- **IP-Based Location Detection** — Automatically detects your location to show local AQI and weather
- **Sensor Dashboard** — Unified view of MySQL sensor data readings via FastAPI + SQLAlchemy
- **PM2.5 AQI Prediction** — Random Forest & Linear Regression models compared side-by-side; live sensor data or manual input; actual AQI lookup by timestamp

---

## Architecture

```
browser  ──►  frontend (Next.js :3000)  ──►  backend (FastAPI :8000)  ──►  external APIs
                                                      │                       (AQICN, Open-Meteo, ip-api)
                                                      └──►  MySQL :3306
                                                              ├── sensor_data
                                                              └── aqi_data
```

---

## Requirements

| Tool        | Version | Notes                                 |
| ----------- | ------- | ------------------------------------- |
| **Node.js** | ≥ 18.x  | Required for the frontend             |
| **npm**     | ≥ 9.x   | Comes with Node.js                    |
| **Python**  | ≥ 3.11  | Required for the backend              |
| **MySQL**   | ≥ 8.x   | Optional — dashboard works without it |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/PhruekCh/SAM-Smart-Air-Measure.git
cd SAM-Smart-Air-Measure
```

### 2. Set up the backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # then edit .env with your DB credentials
uvicorn main:app --reload   # runs on http://localhost:8000
# or run python -m uvicorn main:app --reload
```

Backend `.env` variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sam
AQICN_TOKEN=XXXXXXXXXXXXXXXXXXXX
```

> **Note:** If MySQL is not running the API still works — the dashboard will show a "Database Not Connected" status.

### 3. Set up the frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL if backend is not on :8000
npm run dev                 # runs on http://localhost:3000
```

Frontend `.env.local` variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Generate ML model artifacts

Required to use the `/predict` page.

```bash
cd analysis
pip install scikit-learn joblib pandas
python save_model.py
```

This trains both models on the full dataset and saves:
- `backend/models/rf_model.pkl` — Random Forest (R² = 0.86)
- `backend/models/mlr_model.pkl` — Multiple Linear Regression (R² = 0.61)
- `backend/static/feature_importance.png`
- `backend/static/model_comparison.png`

---

## Pages

| Route       | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| `/`         | Landing page with hero section and feature cards                   |
| `/features` | Real-time AQI, pollutant readings, current weather, 7-day forecast |
| `/dashboard`| Database connection status and sensor data overview                |
| `/predict`  | PM2.5 AQI prediction — RF vs MLR side-by-side with actual AQI     |

---

## API Endpoints (FastAPI)

| Endpoint                  | Method | Cache  | Description                                        |
| ------------------------- | ------ | ------ | -------------------------------------------------- |
| `/api/aqi`                | GET    | 10 min | AQI proxy → aqicn.org (`lat`, `lng`)               |
| `/api/weather`            | GET    | 15 min | Weather proxy → Open-Meteo (`lat`, `lon`, `timezone`) |
| `/api/location`           | GET    | 1 hr   | IP geolocation → ip-api.com                        |
| `/api/dashboard/stats`    | GET    | —      | MySQL `sensor_data` record count                   |
| `/api/predict/latest`     | GET    | —      | Latest sensor row + nearest actual AQI from DB     |
| `/api/predict/actual`     | GET    | —      | Nearest actual AQI for a given `ts` query param    |
| `/api/predict`            | POST   | —      | Predict PM2.5 AQI with RF and MLR models           |

Interactive docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## ML Models

Both models are trained on integrated sensor + TMD weather data (`analysis/output/integrated_air_quality_data.csv`) using 5-Fold Cross Validation.

| Model                      | CV R²  | CV RMSE |
| -------------------------- | ------ | ------- |
| **Random Forest** (depth=5, 100 trees) | **0.86** | 7.10 |
| Multiple Linear Regression | 0.61   | 11.72   |

**Features (9):** `temp`, `humidity`, `gas_co`, `temp_tmd`, `humidity_tmd`, `rainfall_tmd`, `place_enc`, `pm25`, `pm10`

**Target:** `pm25_aqi` (US EPA PM2.5 AQI)

---

## Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — async Python API framework
- **[SQLAlchemy](https://www.sqlalchemy.org/)** + **PyMySQL** — MySQL connector (Core / raw `text()` queries)
- **[httpx](https://www.python-httpx.org/)** — async HTTP client for external API proxying
- **[scikit-learn](https://scikit-learn.org/)** + **joblib** — ML model training and serving
- **cachetools** — in-memory TTL caching

### Frontend
- **[Next.js 16](https://nextjs.org/)** (App Router + Turbopack) + TypeScript
- **React 19**
- **Vanilla CSS** — glassmorphism design, no UI library

---

## Project Structure

```
SAM-Smart-Air-Measure/
├── analysis/
│   ├── random_forest_pm25.ipynb   # Model training & evaluation notebook
│   ├── save_model.py              # Export RF + MLR models and charts to backend/
│   └── output/                   # Generated CSVs and PNGs
├── backend/
│   ├── main.py                   # FastAPI app entry point + CORS
│   ├── database.py               # SQLAlchemy engine + DB query helpers
│   ├── requirements.txt
│   ├── .env.example
│   ├── models/                   # Saved .pkl model files (git-ignored)
│   ├── static/                   # Served chart PNGs (git-ignored)
│   └── routers/
│       ├── aqi.py                # GET /api/aqi
│       ├── weather.py            # GET /api/weather
│       ├── location.py           # GET /api/location
│       ├── dashboard.py          # GET /api/dashboard/stats
│       └── predict.py            # GET+POST /api/predict/*
└── frontend/
    ├── src/app/
    │   ├── features/             # Air quality analytics page
    │   ├── dashboard/            # Sensor dashboard page
    │   ├── predict/              # ML prediction page
    │   ├── globals.css           # Global styles & design system
    │   ├── layout.tsx            # Root layout with navigation
    │   └── page.tsx              # Landing page
    ├── public/
    ├── .env.example
    └── package.json
```

---

## License

This project is for educational purposes (DAQ course project).
