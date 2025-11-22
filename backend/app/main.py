from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
