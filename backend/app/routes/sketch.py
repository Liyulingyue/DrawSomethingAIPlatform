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


class ModelConfig(BaseModel):
    url: str | None = None
    key: str | None = None
    model: str | None = None


class GenerateSketchRequest(BaseModel):
    """生成简笔画请求"""
    prompt: str = Field(..., description="文本提示")
    max_steps: int = Field(default=config.SKETCH_MAX_STEPS, description="最大步数", ge=1, le=50)
    sort_method: str = Field(default=config.SKETCH_SORT_METHOD, description="排序方法: area 或 position")
    session_id: str | None = Field(None, description="用户会话ID，可选")
    config: ModelConfig | None = None
    call_preference: str | None = None  # 调用偏好: 'custom' 或 'server'


class DecomposeImageRequest(BaseModel):
    """分解图片请求"""
    image: str = Field(..., description="base64编码的图片")
    max_steps: int = Field(default=config.SKETCH_MAX_STEPS, description="最大步数", ge=1, le=50)
    sort_method: str = Field(default=config.SKETCH_SORT_METHOD, description="排序方法: area 或 position")
    session_id: str | None = Field(None, description="用户会话ID，可选")


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
        # 获取用户信息（如果有session_id）
        user = None
        calls_remaining = 0
        if request.session_id:
            user = get_user_by_session(request.session_id)
            if user:
                calls_remaining = getattr(user, "calls_remaining", 0)
        
        # 准备配置
        config_custom = request.config.dict(exclude_none=True) if request.config else {}
        config_server = {
            'key': config.TEXT2IMAGE_MODEL_KEY,
            'model': config.TEXT2IMAGE_MODEL_NAME,
            'url': config.TEXT2IMAGE_MODEL_URL
        }
        
        # 根据调用偏好选择配置
        call_preference = (request.call_preference or "custom").lower()
        is_server_call = False
        
        print(f"📊 调用偏好: {call_preference}, 用户: {user}, 剩余点数: {calls_remaining}")
        print(f"📊 自定义配置: {config_custom}")
        
        if call_preference == "server" and user and calls_remaining > 0:
            config_to_use = config_server
            provider = "server"
            is_server_call = True
            print(f"🎨 使用服务器端文生图配置")
        else:
            config_to_use = config_custom
            provider = "custom"
            reason = []
            if call_preference != "server":
                reason.append(f"调用偏好为 '{call_preference}'")
            if not user:
                reason.append("未登录")
            elif calls_remaining <= 0:
                reason.append(f"剩余点数 {calls_remaining}")
            print(f"🎨 使用自定义文生图配置 (原因: {', '.join(reason)})")
        
        # 生成并分解简笔画
        result = sketch_service.generate_and_decompose(
            prompt=request.prompt,
            max_steps=request.max_steps,
            sort_method=request.sort_method,
            config=config_to_use
        )
        
        # 如果是服务器端调用且成功，扣除点数
        if is_server_call and user and request.session_id:
            # 扣除用户点数
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
        else:
            print(f"🎨 自定义文生图调用完成，无需扣费")
        
        return {
            "success": True,
            "data": result,
            "provider": provider
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
