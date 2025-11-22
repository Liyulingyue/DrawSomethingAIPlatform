"""
简笔画生成和分解路由
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.services.sketch_service import sketch_service
from app.config import config

router = APIRouter(prefix="/sketch", tags=["sketch"])


class GenerateSketchRequest(BaseModel):
    """生成简笔画请求"""
    prompt: str = Field(..., description="文本提示")
    max_steps: int = Field(config.SKETCH_MAX_STEPS, description="最大步数", ge=1, le=50)
    sort_method: str = Field(config.SKETCH_SORT_METHOD, description="排序方法: area 或 position")


class DecomposeImageRequest(BaseModel):
    """分解图片请求"""
    image: str = Field(..., description="base64编码的图片")
    max_steps: int = Field(config.SKETCH_MAX_STEPS, description="最大步数", ge=1, le=50)
    sort_method: str = Field(config.SKETCH_SORT_METHOD, description="排序方法: area 或 position")


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
        result = sketch_service.generate_and_decompose(
            prompt=request.prompt,
            max_steps=request.max_steps,
            sort_method=request.sort_method
        )
        
        return {
            "success": True,
            "data": result
        }
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
