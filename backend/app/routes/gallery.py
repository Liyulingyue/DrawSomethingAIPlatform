import os
import json
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from ..shared import GALLERY_DIR, user_sessions

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
        "timestamp": timestamp,
        "likes": 0
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

@router.post("/like/{filename}")
async def like_gallery_item(filename: str):
    if not os.path.exists(GALLERY_JSON):
        raise HTTPException(status_code=404, detail="Gallery not found")

    with open(GALLERY_JSON, "r", encoding="utf-8") as f:
        gallery = json.load(f)

    # Find and update the item
    for item in gallery:
        if item["filename"] == filename:
            item["likes"] = (item.get("likes", 0) + 1)
            break
    else:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    # Save updated gallery data
    with open(GALLERY_JSON, "w", encoding="utf-8") as f:
        json.dump(gallery, f, ensure_ascii=False, indent=2)

    return {"message": "Liked successfully", "likes": item["likes"]}

@router.get("/list")
async def get_gallery_list():
    if not os.path.exists(GALLERY_JSON):
        return []

    with open(GALLERY_JSON, "r", encoding="utf-8") as f:
        gallery = json.load(f)

    # Sort by timestamp (newest first) and ensure likes field exists
    gallery.sort(key=lambda x: x["timestamp"], reverse=True)
    for item in gallery:
        if "likes" not in item:
            item["likes"] = 0

    return gallery


@router.delete("/{filename}")
async def delete_gallery_item(filename: str, session_id: str = Header(None)):
    if not session_id:
        raise HTTPException(status_code=401, detail="Session required")
    
    from ..shared import get_user_by_session
    user = get_user_by_session(session_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    if not os.path.exists(GALLERY_JSON):
        raise HTTPException(status_code=404, detail="Gallery not found")

    with open(GALLERY_JSON, "r", encoding="utf-8") as f:
        gallery = json.load(f)

    # Find and remove the item
    for i, item in enumerate(gallery):
        if item["filename"] == filename:
            gallery.pop(i)
            filepath = os.path.join(GALLERY_DIR, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
            break
    else:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    # Save updated gallery data
    with open(GALLERY_JSON, "w", encoding="utf-8") as f:
        json.dump(gallery, f, ensure_ascii=False, indent=2)

    return {"message": "Deleted successfully"}