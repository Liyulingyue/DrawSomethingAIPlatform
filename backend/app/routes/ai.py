from fastapi import APIRouter
from pydantic import BaseModel
from ..services.ai import guess_drawing

router = APIRouter(prefix="/ai", tags=["ai"])


class ModelConfig(BaseModel):
    url: str | None = None
    key: str | None = None
    model: str | None = None
    prompt: str | None = None


class GuessRequest(BaseModel):
    image: str
    clue: str | None = None
    hint: str | None = None  # legacy payload key
    config: ModelConfig | None = None


@router.post("/guess")
@router.post("/recognize")
async def guess(req: GuessRequest):
    """Call ERNIE vision-language model (or fallback heuristic) to guess drawing content."""
    clue = req.clue or req.hint
    config = req.config.dict(exclude_none=True) if req.config else None
    result = guess_drawing(req.image, clue, config)
    return result
