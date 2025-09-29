from fastapi import APIRouter
from pydantic import BaseModel
from ..services.ai import recognize_drawing

router = APIRouter(prefix="/ai", tags=["ai"])


class RecognizeRequest(BaseModel):
    image: str
    hint: str


@router.post("/recognize")
async def recognize(req: RecognizeRequest):
    """Call ERNIE vision-language model (or fallback heuristic) to evaluate drawing."""
    result = recognize_drawing(req.image, req.hint)
    return result
