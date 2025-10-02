from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Literal, Optional

GuessStatus = Literal["pending", "guessed", "skipped"]


@dataclass
class PlayerState:
    username: str
    is_ready: bool = False
    score: int = 0
    guess_status: GuessStatus = "pending"
    last_guess_at: float = 0.0
    last_action_at: float = 0.0
    model_config: Dict[str, str] = field(default_factory=dict)
    model_config_updated_at: float = 0.0
    ai_guess: Optional[Dict[str, Any]] = None
    ai_guess_at: float = 0.0

    def to_public_dict(self) -> dict:
        return {
            "username": self.username,
            "is_ready": self.is_ready,
            "score": self.score,
            "guess_status": self.guess_status,
            "model_configured": self.has_model_config(),
            "ai_guess": dict(self.ai_guess) if self.ai_guess else None,
            "ai_guess_at": self.ai_guess_at,
        }

    def mark_ready(self, ready: bool, ts: float) -> None:
        self.is_ready = ready
        self.last_action_at = ts

    def reset_for_round(self) -> None:
        self.guess_status = "pending"
        self.last_guess_at = 0.0
        self.clear_ai_guess()

    def mark_guess(self, status: GuessStatus, ts: float) -> None:
        self.guess_status = status
        self.last_guess_at = ts
        self.last_action_at = ts

    def add_score(self, delta: int) -> None:
        self.score = max(0, self.score + delta)

    def set_model_config(self, config: Dict[str, str], ts: float) -> None:
        self.model_config = dict(config)
        self.model_config_updated_at = ts
        self.last_action_at = ts

    def get_model_config(self) -> Dict[str, str]:
        return dict(self.model_config)

    def has_model_config(self) -> bool:
        cfg = self.model_config or {}
        return bool(cfg.get("url") and cfg.get("key"))

    def set_ai_guess(self, guess: Optional[Dict[str, Any]], ts: float) -> None:
        self.ai_guess = dict(guess) if guess else None
        self.ai_guess_at = ts if guess else 0.0
        self.last_action_at = ts

    def clear_ai_guess(self) -> None:
        self.ai_guess = None
        self.ai_guess_at = 0.0
