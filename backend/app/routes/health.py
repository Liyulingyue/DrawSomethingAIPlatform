from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """健康检查端点，用于前端验证后端是否可用"""
    return {"status": "ok", "message": "Backend is running"}
