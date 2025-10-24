import os
import json
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..shared import GALLERY_DIR

router = APIRouter(prefix="/gallery", tags=["gallery"])

GALLERY_JSON = os.path.join(GALLERY_DIR, "gallery.json")

class SaveGalleryRequest(BaseModel):
    image: str  # base64 encoded image
    name: str = "佚名"

@router.post("/save")
async def save_to_gallery(request: SaveGalleryRequest):
    # Ensure gallery directory exists
    os.makedirs(GALLERY_DIR, exist_ok=True)

    # Load existing gallery data
    if os.path.exists(GALLERY_JSON):
        with open(GALLERY_JSON, "r", encoding="utf-8") as f:
            gallery = json.load(f)
    else:
        gallery = []

    # Decode and save image
    try:
        image_data = base64.b64decode(request.image.split(',')[1])  # Remove data:image/png;base64,
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}.png"
        filepath = os.path.join(GALLERY_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

    # Add to gallery list
    gallery.append({
        "filename": filename,
        "name": request.name,
        "timestamp": timestamp
    })

    # Maintain max 100 images - clean up on every insert, max 2 deletions per insert
    if len(gallery) > 100:
        # Sort by timestamp and remove oldest (up to 2 images)
        gallery.sort(key=lambda x: x["timestamp"])
        deletions = min(2, len(gallery) - 100)  # Don't delete more than needed, max 2 per insert
        for _ in range(deletions):
            if gallery:
                oldest = gallery.pop(0)
                oldest_filepath = os.path.join(GALLERY_DIR, oldest["filename"])
                if os.path.exists(oldest_filepath):
                    os.remove(oldest_filepath)
                    print(f"Removed old gallery image: {oldest_filepath}")

    # Save updated gallery data
    with open(GALLERY_JSON, "w", encoding="utf-8") as f:
        json.dump(gallery, f, ensure_ascii=False, indent=2)

    return {"message": "Saved to gallery"}

@router.get("/list")
async def get_gallery_list():
    if os.path.exists(GALLERY_JSON):
        with open(GALLERY_JSON, "r", encoding="utf-8") as f:
            gallery = json.load(f)
        # Sort by timestamp descending (newest first)
        gallery.sort(key=lambda x: x["timestamp"], reverse=True)
        return gallery
    return []