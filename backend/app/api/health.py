import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.database import get_db
from backend.app.config import settings

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    mem_mb = 0
    if HAS_PSUTIL:
        try:
            process = psutil.Process(os.getpid())
            mem_mb = round(process.memory_info().rss / (1024 * 1024), 2)
        except Exception:
            pass

    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENV,
        "database": db_status,
        "memory_rss_mb": mem_mb,
        "api_v1_prefix": settings.API_V1_PREFIX
    }
