import os
from typing import Any, Dict, List, Optional

import httpx

MODEL_NAME = "ernie-4.5-vl-28b-a3b"
DEFAULT_PROMPT = "请仔细观察提供的图像，推测画面所表达的中文词语或短语，仅返回最可能的答案。"

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


def _call_ernie_inference(
    access_token: str,
    image: str,
    prompt: str,
    model_name: Optional[str] = None,
) -> Dict[str, Any]:
    endpoint = os.getenv("ERNIE_API_ENDPOINT")
    if not endpoint:
        raise AIServiceNotConfigured("ERNIE_API_ENDPOINT 未配置")

    payload = {
        "model": model_name or MODEL_NAME,
        "input": {
            "image": image,
            "prompt": prompt,
        },
    }

    response = httpx.post(
        f"{endpoint}?access_token={access_token}",
        json=payload,
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def _build_instruction(clue: Optional[str], custom_prompt: Optional[str]) -> str:
    base = (custom_prompt or "").strip() or DEFAULT_PROMPT
    if clue:
        base += f"\n参考线索：{clue}"
    return base


def _sanitize_config(config: Optional[Dict[str, Optional[str]]]) -> Dict[str, str]:
    sanitized: Dict[str, str] = {}
    if not config:
        return sanitized
    for key, value in config.items():
        if isinstance(value, str):
            sanitized[key] = value.strip()
    return sanitized


def _call_custom_model(image: str, prompt: str, config: Dict[str, str]) -> Dict[str, Any]:
    url = config.get("url")
    if not url:
        raise AIServiceNotConfigured("自定义模型 URL 未提供")

    headers: Dict[str, str] = {}
    api_key = config.get("key")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers.setdefault("X-API-Key", api_key)

    payload = {
        "model": config.get("model") or MODEL_NAME,
        "input": {
            "image": image,
            "prompt": prompt,
        },
    }

    response = httpx.post(url, json=payload, headers=headers or None, timeout=30.0)
    response.raise_for_status()
    return response.json()


def _normalize_candidate_text(text: str) -> List[str]:
    cleaned = text.replace("\r", "\n").replace("，", ",").replace("。", "\n")
    segments: List[str] = []
    for part in cleaned.split("\n"):
        sub_parts = part.split(",") if "," in part else [part]
        for sub in sub_parts:
            candidate = sub.strip(" \t:-。.,;；")
            if candidate:
                segments.append(candidate)
    # 去重但保持顺序
    seen = set()
    unique: List[str] = []
    for seg in segments:
        key = seg.lower()
        if key not in seen:
            seen.add(key)
            unique.append(seg)
    return unique


def _extract_guesses(data: Dict[str, Any]) -> Dict[str, Any]:
    result = data.get("result") or data.get("results") or data.get("data")
    best_guess: Optional[str] = None
    alternatives: List[str] = []
    confidence: Optional[float] = None

    def _maybe_append(value: Any):
        nonlocal best_guess, alternatives, confidence
        if not value:
            return
        if isinstance(value, str):
            candidates = _normalize_candidate_text(value)
            if candidates:
                if not best_guess:
                    best_guess = candidates[0]
                    if len(candidates) > 1:
                        alternatives.extend(candidates[1:])
                else:
                    alternatives.extend(c for c in candidates if c.lower() != best_guess.lower())
        elif isinstance(value, dict):
            label = value.get("label") or value.get("content") or value.get("text")
            _maybe_append(label)
            conf_val = value.get("confidence")
            if isinstance(conf_val, (int, float)):
                if confidence is None or float(conf_val) > confidence:
                    confidence = float(conf_val)
        elif isinstance(value, list):
            for item in value:
                _maybe_append(item)

    _maybe_append(result)

    if not best_guess and isinstance(data.get("output"), str):
        _maybe_append(data["output"])

    if best_guess:
        # 去除重复候选
        unique_alternatives: List[str] = []
        seen_lower = {best_guess.lower()}
        for alt in alternatives:
            lower = alt.lower()
            if lower not in seen_lower:
                seen_lower.add(lower)
                unique_alternatives.append(alt)
        alternatives = unique_alternatives

    return {
        "best_guess": best_guess,
        "alternatives": alternatives,
        "confidence": confidence,
    }
def guess_drawing(
    image: str,
    clue: Optional[str] = None,
    config: Optional[Dict[str, Optional[str]]] = None,
) -> Dict[str, Any]:
    """Call ERNIE model (or a custom endpoint) to guess the drawing content."""

    sanitized_config = _sanitize_config(config)
    prompt = _build_instruction(clue, sanitized_config.get("prompt"))

    if sanitized_config.get("url"):
        try:
            data = _call_custom_model(image, prompt, sanitized_config)
            parsed = _extract_guesses(data)
            return {
                "success": True,
                "configured": True,
                "best_guess": parsed.get("best_guess"),
                "alternatives": parsed.get("alternatives", []),
                "confidence": parsed.get("confidence"),
                "raw": data,
                "provider": "custom",
            }
        except Exception as exc:
            return {
                "success": False,
                "configured": True,
                "best_guess": None,
                "alternatives": [],
                "confidence": None,
                "error": str(exc),
                "provider": "custom",
            }

    token = _get_access_token()
    if token:
        try:
            data = _call_ernie_inference(token, image, prompt, sanitized_config.get("model"))
            parsed = _extract_guesses(data)
            return {
                "success": True,
                "configured": True,
                "best_guess": parsed.get("best_guess"),
                "alternatives": parsed.get("alternatives", []),
                "confidence": parsed.get("confidence"),
                "raw": data,
                "provider": "ernie",
            }
        except Exception as exc:
            return {
                "success": False,
                "configured": True,
                "best_guess": None,
                "alternatives": [],
                "confidence": None,
                "error": str(exc),
                "provider": "ernie",
            }

    # fallback heuristic when AI not configured
    return {
        "success": True,
        "configured": False,
        "best_guess": clue or None,
        "alternatives": [],
        "confidence": None,
        "raw": {"reason": "AI service not configured, fallback heuristic"},
        "provider": "fallback",
    }
