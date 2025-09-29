import os
import time
from typing import Any, Dict

import httpx

MODEL_NAME = "ernie-4.5-vl-28b-a3b"

class AIServiceNotConfigured(Exception):
    """Raised when ERNIE credentials are missing."""


def _get_access_token() -> str | None:
    api_key = os.getenv("ERNIE_API_KEY")
    secret_key = os.getenv("ERNIE_API_SECRET")
    token_url = os.getenv("ERNIE_OAUTH_URL", "https://aip.baidubce.com/oauth/2.0/token")
    if not api_key or not secret_key:
        return None

    try:
        response = httpx.get(
            token_url,
            params={
                "grant_type": "client_credentials",
                "client_id": api_key,
                "client_secret": secret_key,
            },
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("access_token")
    except Exception:
        return None


def _call_ernie_inference(access_token: str, image: str, hint: str) -> Dict[str, Any]:
    endpoint = os.getenv("ERNIE_API_ENDPOINT")
    if not endpoint:
        raise AIServiceNotConfigured("ERNIE_API_ENDPOINT 未配置")

    payload = {
        "model": MODEL_NAME,
        "input": {
            "image": image,
            "prompt": f"请识别画面内容，并返回最可能的中文词语。提示词: {hint}",
        },
    }

    response = httpx.post(
        f"{endpoint}?access_token={access_token}",
        json=payload,
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def recognize_drawing(image: str, hint: str) -> Dict[str, Any]:
    """Call ERNIE model to recognize drawing, fallback to heuristic if not configured."""
    token = _get_access_token()
    if token:
        try:
            data = _call_ernie_inference(token, image, hint)
            prediction = data.get("result", {}).get("label") or data.get("result", {}).get("content")
            confidence = data.get("result", {}).get("confidence")
            matched = False
            if prediction:
                matched = hint.strip().lower() in str(prediction).lower()
            return {
                "success": True,
                "configured": True,
                "label": prediction,
                "confidence": confidence,
                "matched": matched,
                "raw": data,
            }
        except Exception as exc:
            return {
                "success": False,
                "configured": True,
                "matched": False,
                "label": None,
                "confidence": None,
                "error": str(exc),
            }

    # fallback heuristic when AI not configured
    return {
        "success": True,
        "configured": False,
        "label": hint,
        "confidence": 1.0 if image else 0.0,
        "matched": bool(image),
        "raw": {"reason": "AI service not configured, fallback heuristic"},
    }
