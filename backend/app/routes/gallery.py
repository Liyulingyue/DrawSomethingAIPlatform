import os
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import Gallery, User, get_db
from ..shared import get_user_by_session

router = APIRouter(prefix="/gallery", tags=["gallery"])

class SaveGalleryRequest(BaseModel):
    image: str  # base64 encoded image
    name: str = "佚名"

@router.post("/save")
async def save_to_gallery(request: SaveGalleryRequest, session_id: str = Header(None), db: Session = Depends(get_db)):
    # Get user from session if provided
    user = None
    if session_id:
        user = get_user_by_session(session_id)

    # Decode image data
    try:
        image_data = base64.b64decode(request.image.split(',')[1])  # Remove data:image/png;base64,
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

    # Generate filename and timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}.png"

    # Get username: use provided name, or user's real name if logged in and no name provided
    username = request.name or "佚名"  # Ensure we have a name
    user_id = None
    if user:
        user_id = user.id

    # Create gallery entry in database with image data
    gallery_item = Gallery(
        filename=filename,
        username=username,
        user_id=user_id,
        timestamp=timestamp,
        likes=0,
        image_data=image_data,
        image_mime_type='image/png'
    )
    db.add(gallery_item)

    # Maintain max 100 images - clean up on every insert, max 2 deletions per insert
    total_count = db.query(Gallery).count()
    if total_count >= 100:
        # Get oldest entries (up to 2)
        oldest_entries = db.query(Gallery).order_by(Gallery.created_at).limit(2).all()
        deletions = min(2, total_count - 99)  # Keep 100, so delete if we have 101+

        for entry in oldest_entries[:deletions]:
            db.delete(entry)

    db.commit()

    return {"message": "Saved to gallery"}

@router.post("/like/{filename}")
async def like_gallery_item(filename: str, db: Session = Depends(get_db)):
    # Find the gallery item
    gallery_item = db.query(Gallery).filter(Gallery.filename == filename).first()
    if not gallery_item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    # Increment likes
    gallery_item.likes += 1
    db.commit()

    return {"message": "Liked successfully", "likes": gallery_item.likes}

@router.get("/list")
async def get_gallery_list(db: Session = Depends(get_db)):
    # Get all gallery items, ordered by creation time (newest first)
    gallery_items = db.query(Gallery).order_by(Gallery.created_at.desc()).all()

    # Convert to the expected format with base64 encoded image data
    gallery_list = []
    for item in gallery_items:
        # Encode image data to base64
        image_base64 = base64.b64encode(item.image_data).decode('utf-8')
        image_data_url = f"data:{item.image_mime_type};base64,{image_base64}"

        gallery_list.append({
            "filename": item.filename,
            "name": item.username,
            "user_id": item.user_id,
            "timestamp": item.timestamp,
            "likes": item.likes,
            "image_data": image_data_url  # Add base64 encoded image data
        })

    return gallery_list


@router.delete("/{filename}")
async def delete_gallery_item(filename: str, session_id: str = Header(None), db: Session = Depends(get_db)):
    if not session_id:
        raise HTTPException(status_code=401, detail="Session required")

    user = get_user_by_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    # Find the gallery item
    gallery_item = db.query(Gallery).filter(Gallery.filename == filename).first()
    if not gallery_item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    # Check if user is admin or the owner of the gallery item
    if not user.is_admin and gallery_item.user_id != user.id:
        raise HTTPException(status_code=403, detail="Permission denied: can only delete your own works or require admin access")

    # Remove from database (image data is stored in DB, no file to delete)
    db.delete(gallery_item)
    db.commit()

    return {"message": "Deleted successfully"}