"""Health check endpoints."""

from fastapi import APIRouter
import shutil

router = APIRouter()


@router.get("")
async def health_check():
    """Basic health check."""
    return {"status": "healthy"}


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check including dependencies."""
    checks = {
        "service": "healthy",
        "tesseract": "unknown",
        "storage": "unknown",
    }

    # Check if tesseract is available
    tesseract_path = shutil.which("tesseract")
    checks["tesseract"] = "available" if tesseract_path else "not_found"

    # Check storage directory
    from app.config import settings
    import os
    checks["storage"] = "available" if os.path.isdir(settings.storage_path) else "not_available"

    overall_status = "healthy" if all(
        v in ["healthy", "available"] for v in checks.values()
    ) else "degraded"

    return {
        "status": overall_status,
        "checks": checks,
    }
