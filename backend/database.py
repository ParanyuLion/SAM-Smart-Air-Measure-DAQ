import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "sam")

_engine = None
_init_error: str | None = None

try:
    DATABASE_URL = URL.create(
        drivername="mysql+pymysql",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=int(DB_PORT),
        database=DB_NAME,
    )
    _engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 15},
    )
except Exception as e:
    _init_error = str(e)
    print(f"Database initialization failed: {e}")


def get_db_stats() -> dict:
    if _engine is None:
        return {
            "connected": False,
            "record_count": 0,
            "error_msg": _init_error or "Database not initialized",
        }
    try:
        with _engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM sensor_data")).scalar()
            return {"connected": True, "record_count": count, "error_msg": ""}
    except SQLAlchemyError as e:
        return {"connected": False, "record_count": 0, "error_msg": str(e)}


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


def get_latest_tmd_row() -> dict | None:
    if _engine is None:
        return None
    try:
        with _engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM tmd_data ORDER BY id DESC LIMIT 1")
            ).mappings().first()
            return dict(row) if row else None
    except SQLAlchemyError:
        return None


def get_tmd_row_near_ts(ts) -> dict | None:
    """Return the latest row from tmd_data closest to *ts*."""
    if _engine is None or ts is None:
        return None
    try:
        with _engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT * FROM tmd_data "
                    "ORDER BY ABS(TIMESTAMPDIFF(SECOND, ts, :target_ts)) ASC "
                    "LIMIT 1"
                ),
                {"target_ts": ts},
            ).mappings().first()
            return dict(row) if row else None
    except SQLAlchemyError as e:
        print(f"[predict] get_tmd_row_near_ts error: {e}")
        return None


def get_actual_aqi_near_ts(ts) -> dict | None:
    """Return the {pm25, ts} row from aqi_data closest to *ts*."""
    if _engine is None:
        return None
    try:
        with _engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT pm25, ts FROM aqi_data "
                    "WHERE pm25 IS NOT NULL "
                    "ORDER BY ABS(TIMESTAMPDIFF(SECOND, ts, :target_ts)) ASC "
                    "LIMIT 1"
                ),
                {"target_ts": ts},
            ).mappings().first()
            return dict(row) if row else None
    except SQLAlchemyError as e:
        print(f"[predict] get_actual_aqi_near_ts error: {e}")
        return None
