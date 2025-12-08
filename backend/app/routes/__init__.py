from .auth import router as auth_router
from .ai import router as ai_router
from .gallery import router as gallery_router
from .sketch import router as sketch_router
from .health import router as health_router

__all__ = [
	"auth_router",
	"ai_router",
	"gallery_router",
	"sketch_router",
	"health_router",
]
