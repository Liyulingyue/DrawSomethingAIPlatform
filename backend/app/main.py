from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .shared import GALLERY_DIR
from .routes import (
    auth_router,
    rooms_router,
    drawing_router,
    messages_router,
    ai_router,
    gallery_router,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure gallery directory exists
os.makedirs(GALLERY_DIR, exist_ok=True)

app.include_router(gallery_router)
app.mount("/gallery/static", StaticFiles(directory=GALLERY_DIR), name="gallery-static")

app.include_router(auth_router)
app.include_router(rooms_router)
app.include_router(drawing_router)
app.include_router(messages_router)
app.include_router(ai_router)


@app.get("/")
async def root():
    return {"msg": "DrawSomethingAIPlatform backend running"}
