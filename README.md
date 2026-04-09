# SAM — Smart Air Measure

Real-time air quality monitoring and analytics application. A **Next.js** frontend displays live AQI and weather data fetched through a **FastAPI** backend, which also queries an optional MySQL sensor database.

## Features

- **Air Quality Analytics** — Real-time AQI from [aqicn.org](https://aqicn.org/) with US EPA color-coded levels (Good → Hazardous)
- **Weather Forecast** — 7-day forecast via [Open-Meteo](https://open-meteo.com/) with WMO weather codes
- **IP-Based Location Detection** — Automatically detects your location to show local AQI and weather
- **Sensor Dashboard** — Unified view of MySQL sensor data readings via FastAPI + SQLAlchemy

---

## Architecture

```
browser  ──►  frontend (Next.js :3000)  ──►  backend (FastAPI :8000)  ──►  external APIs
                                                      │                       (AQICN, Open-Meteo, ip-api)
                                                      └──►  MySQL :3306
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

---

## Pages

| Route        | Description                                                       |
| ------------ | ----------------------------------------------------------------- |
| `/`          | Landing page with hero section and feature cards                  |
| `/features`  | Real-time AQI, pollutant readings, current weather, 7-day forecast |
| `/dashboard` | Database connection status and sensor data overview               |

## API Endpoints (FastAPI)

| Endpoint                | Method | Cache   | Description                              |
| ----------------------- | ------ | ------- | ---------------------------------------- |
| `/api/aqi`              | GET    | 10 min  | AQI proxy → aqicn.org (`lat`, `lng`)     |
| `/api/weather`          | GET    | 15 min  | Weather proxy → Open-Meteo (`lat`, `lon`, `timezone`) |
| `/api/location`         | GET    | 1 hr    | IP geolocation → ip-api.com              |
| `/api/dashboard/stats`  | GET    | —       | MySQL `sensor_data` record count         |

Interactive docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — async Python API framework
- **[SQLAlchemy](https://www.sqlalchemy.org/)** + **PyMySQL** — MySQL ORM
- **[httpx](https://www.python-httpx.org/)** — async HTTP client for external API proxying
- **cachetools** — in-memory TTL caching

### Frontend
- **[Next.js 16](https://nextjs.org/)** (App Router + Turbopack) + TypeScript
- **React 19**
- **Vanilla CSS** — glassmorphism design, no UI library

---

## Project Structure

```
SAM-Smart-Air-Measure/
├── backend/
│   ├── main.py              # FastAPI app entry point + CORS
│   ├── database.py          # SQLAlchemy engine + stats query
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       ├── aqi.py           # GET /api/aqi
│       ├── weather.py       # GET /api/weather
│       ├── location.py      # GET /api/location
│       └── dashboard.py     # GET /api/dashboard/stats
└── frontend/
    ├── src/
    │   └── app/
    │       ├── features/    # Air quality analytics page
    │       ├── dashboard/   # Sensor dashboard page
    │       ├── globals.css  # Global styles & design system
    │       ├── layout.tsx   # Root layout with navigation
    │       └── page.tsx     # Landing page
    ├── public/
    ├── .env.example
    └── package.json
```

## License

This project is for educational purposes (DAQ course project).
