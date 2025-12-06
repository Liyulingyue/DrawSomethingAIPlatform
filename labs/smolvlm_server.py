#!/usr/bin/env python
"""
SmolVLM-256M-Instruct 原生推理服务
基于 transformers 和 modelscope，提供 OpenAI 兼容的 API
"""

import os
import sys
import base64
import asyncio
from pathlib import Path
from typing import Optional, List
from datetime import datetime
import uuid

import torch
from PIL import Image
from io import BytesIO

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

try:
    from modelscope import AutoProcessor, AutoModelForVision2Seq
except ImportError:
    print("❌ 未安装 modelscope，请先运行:")
    print("pip install modelscope transformers pillow torch")
    sys.exit(1)

# ==================== 配置 ====================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "HuggingFaceTB/SmolVLM-256M-Instruct"
HOST = "127.0.0.1"
PORT = 8888

print(f"🔧 设备: {DEVICE}")
print(f"🤖 模型: {MODEL_NAME}")

# ==================== 模型加载 ====================
print("🔄 加载模型中...")

processor = AutoProcessor.from_pretrained(MODEL_NAME)
model = AutoModelForVision2Seq.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.bfloat16,
    _attn_implementation="flash_attention_2" if DEVICE == "cuda" else "eager",
).to(DEVICE)

print("✅ 模型加载完成")

# ==================== FastAPI 应用 ====================
app = FastAPI(title="SmolVLM Service", version="1.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 数据模型 ====================
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str | List[dict]  # 文本或 [{"type": "image", ...}, {"type": "text", "text": "..."}]

class ChatCompletionRequest(BaseModel):
    model: str = "smolvlm-256m"
    messages: List[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 512
    top_p: float = 0.9

class ChatChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatChoice]
    usage: dict

# ==================== 工具函数 ====================
def decode_image_from_base64(image_data: str) -> Image.Image:
    """从 base64 解码图像"""
    image_bytes = base64.b64decode(image_data)
    image = Image.open(BytesIO(image_bytes))
    return image

def encode_image_to_base64(image: Image.Image) -> str:
    """将图像编码为 base64"""
    buffered = BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

@torch.no_grad()
def generate_response(messages: List[ChatMessage], max_tokens: int = 512) -> str:
    """使用模型生成响应"""
    # 提取最后一个用户消息和相关图像
    images = []
    text_content = ""
    
    print(f"\n[generate_response] 开始处理 {len(messages)} 条消息")
    
    # 处理消息，提取图像和文本
    for msg_idx, msg in enumerate(messages):
        print(f"  消息 {msg_idx}: role={msg.role}, content_type={type(msg.content).__name__}")
        
        if msg.role == "user":
            if isinstance(msg.content, str):
                # 纯文本消息
                print(f"    ✅ 纯文本消息: {msg.content[:50]}")
                text_content = msg.content
            elif isinstance(msg.content, list):
                # 多模态消息 (OpenAI 格式)
                print(f"    📦 列表消息，包含 {len(msg.content)} 项")
                for item_idx, item in enumerate(msg.content):
                    print(f"      项 {item_idx}: {item}")
                    
                    if isinstance(item, dict):
                        if item.get("type") == "text":
                            text_content = item.get("text", "")
                            print(f"        📝 提取文本: {text_content[:50]}")
                        elif item.get("type") == "image_url":
                            # 处理 OpenAI image_url 格式
                            image_url = item.get("image_url", {})
                            url = image_url.get("url", "") if isinstance(image_url, dict) else image_url
                            
                            print(f"        🔗 image_url: {url[:80]}...")
                            
                            if url.startswith("data:image"):
                                # Base64 编码的图像
                                try:
                                    base64_str = url.split(",", 1)[1]
                                    image = decode_image_from_base64(base64_str)
                                    images.append(image)
                                    print(f"        ✅ 从 data URI 加载图像成功，大小: {image.size}")
                                except Exception as e:
                                    print(f"        ❌ 从 data URI 加载图像失败: {e}")
                            else:
                                print(f"        ⚠️ 跳过非 base64 URL")
                        elif item.get("type") == "image":
                            # 处理自定义 image 格式（仅类型标记）
                            if "data" in item:
                                try:
                                    image = decode_image_from_base64(item["data"])
                                    images.append(image)
                                    print(f"        ✅ 从 data 字段加载图像成功")
                                except Exception as e:
                                    print(f"        ❌ 从 data 字段加载图像失败: {e}")
    
    print(f"\n[统计] 提取的文本长度: {len(text_content)}, 提取的图像数: {len(images)}")
    
    if len(images) == 0:
        print("⚠️ 警告: 未检测到图像，只处理文本")
    
    # 构建 SmolVLM 格式的消息
    formatted_messages = [
        {
            "role": "user",
            "content": [
                {"type": "image"} for _ in images
            ] + [{"type": "text", "text": text_content}]
        }
    ]
    
    print(f"[格式化消息] {formatted_messages}")
    
    # 应用聊天模板
    prompt = processor.apply_chat_template(formatted_messages, add_generation_prompt=True)
    
    print(f"📍 应用模板后的 Prompt 长度: {len(prompt)}, 首 100 字: {prompt[:100]}")
    
    # 处理输入
    inputs = processor(
        text=prompt,
        images=images if images else None,
        return_tensors="pt"
    )
    inputs = inputs.to(DEVICE)
    
    print(f"✅ 输入已准备: {list(inputs.keys())}")
    for key, val in inputs.items():
        if hasattr(val, 'shape'):
            print(f"    {key}: shape={val.shape}")
    
    # 生成输出
    print(f"🔄 生成中... (max_tokens={max_tokens})")
    generated_ids = model.generate(
        **inputs,
        max_new_tokens=max_tokens,
        do_sample=True,
        temperature=0.7,
    )
    
    # 解码
    generated_texts = processor.batch_decode(
        generated_ids,
        skip_special_tokens=True,
    )
    
    response = generated_texts[0]
    print(f"✅ 生成完成: {response[:100]}...")
    
    return response

# ==================== API 端点 ====================

@app.get("/v1/models")
async def list_models():
    """列出可用模型"""
    return {
        "object": "list",
        "data": [
            {
                "id": "smolvlm-256m",
                "object": "model",
                "created": int(datetime.now().timestamp()),
                "owned_by": "transformers",
                "permission": [],
                "root": "smolvlm-256m",
                "parent": None
            }
        ]
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "model": "SmolVLM-256M-Instruct",
        "device": DEVICE,
        "message": "SmolVLM service is running"
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """
    聊天补全 (OpenAI 兼容)
    
    支持的消息格式:
    - 纯文本: {"role": "user", "content": "问题"}
    - 多模态 (OpenAI 标准): {"role": "user", "content": [{"type": "text", "text": "问题"}, {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}]}
    - 多模态 (自定义): {"role": "user", "content": [{"type": "image", "data": "base64_image"}, {"type": "text", "text": "问题"}]}
    """
    try:
        print(f"\n{'='*60}")
        print(f"📨 收到请求，消息数: {len(request.messages)}")
        
        # 调试: 打印消息结构
        for i, msg in enumerate(request.messages):
            if isinstance(msg.content, list):
                print(f"  消息 {i}: role={msg.role}, content=[", end="")
                for item in msg.content:
                    if isinstance(item, dict):
                        if item.get("type") == "image_url":
                            url = item.get("image_url", {})
                            if isinstance(url, dict):
                                url_str = url.get("url", "")[:50]
                            else:
                                url_str = str(url)[:50]
                            print(f"{{type: image_url, url_preview: {url_str}...}}", end=" ")
                        else:
                            print(f"{{type: {item.get('type')}}}", end=" ")
                print("]")
            else:
                print(f"  消息 {i}: role={msg.role}, content={str(msg.content)[:50]}")
        
        # 生成响应
        response_text = generate_response(
            request.messages,
            max_tokens=request.max_tokens
        )
        
        # 构造 OpenAI 格式的响应
        completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created_time = int(datetime.now().timestamp())
        
        response = ChatCompletionResponse(
            id=completion_id,
            created=created_time,
            model="smolvlm-256m",
            choices=[
                ChatChoice(
                    index=0,
                    message=ChatMessage(
                        role="assistant",
                        content=response_text
                    ),
                    finish_reason="stop"
                )
            ],
            usage={
                "prompt_tokens": len(request.messages[0].content) if request.messages else 0,
                "completion_tokens": len(response_text.split()),
                "total_tokens": len(request.messages[0].content) + len(response_text.split()) if request.messages else 0,
            }
        )
        
        return response.model_dump()
    
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/vision/describe")
async def describe_image(file: UploadFile = File(...), prompt: str = "描述这张图片"):
    """
    描述图像 (直接上传文件)
    """
    try:
        print(f"\n{'='*60}")
        print(f"📸 收到图像: {file.filename}")
        
        # 读取图像
        image_data = await file.read()
        image = Image.open(BytesIO(image_data))
        
        # 准备消息
        messages = [
            ChatMessage(
                role="user",
                content=[
                    {"type": "image"},
                    {"type": "text", "text": prompt}
                ]
            )
        ]
        
        # 生成响应
        response_text = generate_response([messages[0]])
        
        return {
            "status": "success",
            "prompt": prompt,
            "result": response_text
        }
    
    except Exception as e:
        print(f"❌ 错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """根路径"""
    return {
        "name": "SmolVLM Service",
        "version": "1.0.0",
        "model": "SmolVLM-256M-Instruct",
        "device": DEVICE,
        "endpoints": {
            "/v1/models": "列出模型",
            "/v1/chat/completions": "聊天补全 (OpenAI 兼容)",
            "/v1/vision/describe": "图像描述",
            "/health": "健康检查",
            "/docs": "API 文档"
        }
    }

# ==================== 启动函数 ====================
def main():
    """主函数"""
    print("=" * 60)
    print("🚀 SmolVLM-256M-Instruct 服务启动")
    print("=" * 60)
    print()
    print(f"📍 监听地址: http://{HOST}:{PORT}")
    print(f"📚 API 文档: http://{HOST}:{PORT}/docs")
    print(f"🏥 健康检查: http://{HOST}:{PORT}/health")
    print()
    print("⏹️  按 Ctrl+C 停止服务")
    print()
    
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info",
    )

if __name__ == "__main__":
    main()
