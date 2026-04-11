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
