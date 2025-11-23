from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import os
from .routes import (
    auth_router,
    rooms_router,
    drawing_router,
    messages_router,
    ai_router,
    gallery_router,
    sketch_router,
)

app = FastAPI()

# CORS 中间件配置 - 必须在所有路由之前添加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # 显式列出所有方法
    allow_headers=["*"],  # 允许所有请求头
    expose_headers=["*"],  # 暴露所有响应头
    max_age=3600,  # 预检请求的缓存时间（秒）
)

# 添加全局 OPTIONS 处理
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        }
    )

app.include_router(gallery_router)

app.include_router(auth_router)
app.include_router(rooms_router)
app.include_router(drawing_router)
app.include_router(messages_router)
app.include_router(ai_router)
app.include_router(sketch_router)


@app.get("/")
async def root():
    return {"msg": "DrawSomethingAIPlatform backend running"}
