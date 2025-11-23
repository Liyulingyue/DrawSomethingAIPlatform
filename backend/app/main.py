from fastapi import FastAPI
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

# CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有HTTP方法
    allow_headers=["*"],  # 允许所有请求头
    expose_headers=["*"],  # 暴露所有响应头
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
