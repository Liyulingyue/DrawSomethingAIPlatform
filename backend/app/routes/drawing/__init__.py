from fastapi import APIRouter

from . import guessing, management, submissions

router = APIRouter(prefix="/drawing", tags=["drawing"])
router.include_router(management.router)
router.include_router(submissions.router)
router.include_router(guessing.router)

__all__ = ["router", "guessing", "management", "submissions"]
