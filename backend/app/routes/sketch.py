"""
简笔画生成和分解路由
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.services.sketch_service import sketch_service
from app.config import config
from app.shared import get_user_by_session
from app.database import SessionLocal, User, UserSession

router = APIRouter(prefix="/sketch", tags=["sketch"])


class GenerateSketchRequest(BaseModel):
    """生成简笔画请求"""
    prompt: str = Field(..., description="文本提示")
    max_steps: int = Field(config.SKETCH_MAX_STEPS, description="最大步数", ge=1, le=50)
    sort_method: str = Field(config.SKETCH_SORT_METHOD, description="排序方法: area 或 position")
    session_id: str = Field(..., description="用户会话ID")


class DecomposeImageRequest(BaseModel):
    """分解图片请求"""
    image: str = Field(..., description="base64编码的图片")
    max_steps: int = Field(config.SKETCH_MAX_STEPS, description="最大步数", ge=1, le=50)
    sort_method: str = Field(config.SKETCH_SORT_METHOD, description="排序方法: area 或 position")
    session_id: str = Field(..., description="用户会话ID")


@router.post("/generate")
async def generate_sketch(request: GenerateSketchRequest):
    """
    生成简笔画并分解为步骤
    
    Args:
        request: 包含提示词和参数的请求
        
    Returns:
        包含完整简笔画和步骤列表的响应
    """
    try:
        # 检查用户会话和调用点
        user = get_user_by_session(request.session_id)
        if not user:
            raise HTTPException(status_code=401, detail="无效的会话ID")
        
        calls_remaining = getattr(user, "calls_remaining", 0)
        if calls_remaining <= 0:
            raise HTTPException(status_code=402, detail=f"调用次数不足，剩余: {calls_remaining}")
        
        # 生成并分解简笔画
        result = sketch_service.generate_and_decompose(
            prompt=request.prompt,
            max_steps=request.max_steps,
            sort_method=request.sort_method
        )
        
        # 扣除调用点
        db = SessionLocal()
        try:
            session_record = db.query(UserSession).filter(UserSession.session_id == request.session_id).first()
            if session_record:
                user_in_db = db.query(User).filter(User.id == session_record.user_id).first()
                if user_in_db:
                    user_in_db.calls_remaining -= 1
                    db.commit()
                    print(f"🎨 用户 {user_in_db.username} 生成简笔画成功，剩余点数: {user_in_db.calls_remaining}")
                else:
                    print("❌ 无法找到用户记录")
            else:
                print("❌ 无法找到会话记录")
        except Exception as e:
            db.rollback()
            print(f"❌ 扣除点数失败: {e}")
        finally:
            db.close()
        
        return {
            "success": True,
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成简笔画失败: {str(e)}")


@router.post("/decompose")
async def decompose_image(request: DecomposeImageRequest):
    """
    分解已有图片为简笔画步骤
    
    Args:
        request: 包含图片和参数的请求
        
    Returns:
        包含完整简笔画和步骤列表的响应
    """
    try:
        result = sketch_service.decompose_existing_image(
            image_base64=request.image,
            max_steps=request.max_steps,
            sort_method=request.sort_method
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分解图片失败: {str(e)}")
