from fastapi import APIRouter
from database import get_db_stats

router = APIRouter()


@router.get("/dashboard/stats")
def get_dashboard_stats():
    return get_db_stats()
