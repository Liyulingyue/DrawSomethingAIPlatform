from .auth import router as auth_router
from .rooms import router as rooms_router
from .drawing import router as drawing_router
from .messages import router as messages_router
from .ai import router as ai_router

__all__ = [
	"auth_router",
	"rooms_router",
	"drawing_router",
	"messages_router",
	"ai_router",
]
