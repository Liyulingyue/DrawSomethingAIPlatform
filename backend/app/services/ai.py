import json
import os
import re
from collections.abc import Sequence
from typing import Any, Dict, List, Optional

from openai import OpenAI

MODEL_NAME = "ernie-4.5-vl-28b-a3b"

FORMAT_INSTRUCTIONS = (
    "请仅输出一个 JSON 代码块，严格按照如下格式返回：\n"
    "```json\n"
    "{\n"
    '  "best_guess": "最可能的中文词语或短语",\n'
    '  "alternatives": ["备选答案1", "备选答案2"],\n'
    '  "reason": "简要的中文解释"\n'
    "}\n"
    "```\n"
    "其中 alternatives 按可能性从高到低排列，如无可填空数组；不允许输出除上述 JSON 代码块之外的任何文字。"
)

DEFAULT_PROMPT = (
    "你是一位能够理解绘画的中文助手，请根据提供的图像推测其所表达的中文词语或短语，并生成答案。\n"
)

JSON_BLOCK_PATTERN = re.compile(r"```json\s*(.*?)\s*```", re.IGNORECASE | re.DOTALL)

def _is_guess_correct(guess: Optional[str], target: Optional[str]) -> bool:
    """Check if the AI guess matches the target word."""
    if not guess or not target:
        return False
    
    # Normalize both strings for comparison
    guess_normalized = guess.strip().lower()
    target_normalized = target.strip().lower()
    
    # Exact match
    if guess_normalized == target_normalized:
        return True
    
    # Check if target is contained in guess (e.g., target="苹果", guess="一个苹果")
    # This allows AI to be more descriptive while still being correct
    if target_normalized in guess_normalized:
        return True
    
    # Handle common variations for Chinese words
    # Remove common prefixes/suffixes and check again
    common_prefixes = ['一个', '一只', '一朵', '一条', '一张', '一辆', '一座', '一本', '一支']
    common_suffixes = ['的', '了', '着', '过', '们', '子', '儿', '头', '手']
    
    for prefix in common_prefixes:
        if guess_normalized.startswith(prefix) and guess_normalized[len(prefix):].strip() == target_normalized:
            return True
    
    for suffix in common_suffixes:
        if guess_normalized.endswith(suffix) and guess_normalized[:-len(suffix)].strip() == target_normalized:
            return True
    
    return False


def _call_ernie_inference(
    image: str,
    prompt: str,
    model_name: Optional[str] = None,
) -> Dict[str, Any]:
    # 使用AI Studio API Key直接调用
    api_key = os.getenv("AI_STUDIO_API_KEY")
    if not api_key:
        raise AIServiceNotConfigured("AI_STUDIO_API_KEY 未配置")

    client = OpenAI(
        api_key=api_key,
        base_url="https://aistudio.baidu.com/llm/lmapi/v3",
    )

    try:
        # 构造消息，包含文本提示和图片
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image,
                            "detail": "high"
                        }
                    }
                ]
            }
        ]

        completion = client.chat.completions.create(
            model=model_name or MODEL_NAME,
            messages=messages,
            stream=False,  # 不使用流式响应
        )

        # 提取响应内容
        if completion.choices and len(completion.choices) > 0:
            content = completion.choices[0].message.content
            return {"result": content}
        else:
            raise Exception("API返回空响应")

    except Exception as e:
        raise Exception(f"调用ERNIE推理失败: {str(e)}")


def _build_instruction(clue: Optional[str], custom_prompt: Optional[str]) -> str:
    sections: List[str] = []
    sections.append(DEFAULT_PROMPT)
    if custom_prompt and custom_prompt.strip():
        sections.append(custom_prompt.strip())
    if clue:
        sections.append(f"猜词的参考线索：{clue}")
    sections.append(FORMAT_INSTRUCTIONS)
    return "\n\n".join(section for section in sections if section)


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

    api_key = config.get("key")
    if not api_key:
        raise AIServiceNotConfigured("自定义模型 API Key 未提供")

    client = OpenAI(
        api_key=api_key,
        base_url=url,
    )

    try:
        # 构造消息，包含文本提示和图片
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image,
                            "detail": "high"
                        }
                    }
                ]
            }
        ]

        completion = client.chat.completions.create(
            model=config.get("model") or MODEL_NAME,
            messages=messages,
            stream=False,  # 不使用流式响应
        )

        # 提取响应内容
        if completion.choices and len(completion.choices) > 0:
            content = completion.choices[0].message.content
            return {"result": content}
        else:
            raise Exception("API返回空响应")

    except Exception as e:
        raise Exception(f"调用自定义模型失败: {str(e)}")


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


def _parse_float(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _ensure_str_list(values: Any) -> List[str]:
    if values is None:
        return []
    if isinstance(values, str):
        return _normalize_candidate_text(values)
    if isinstance(values, Sequence) and not isinstance(values, (bytes, bytearray)):
        result: List[str] = []
        seen: set[str] = set()
        for item in values:
            if item is None:
                continue
            text = item if isinstance(item, str) else str(item)
            text = text.strip()
            if not text:
                continue
            key = text.lower()
            if key not in seen:
                seen.add(key)
                result.append(text)
        return result
    text = str(values).strip()
    return [text] if text else []


def _extract_json_payload(value: Any) -> Optional[Any]:
    if value is None:
        return None
    if isinstance(value, dict):
        keys = {key.lower() for key in value.keys()}
        if {"best_guess", "alternatives"} & keys:
            return value
        for key in ("json", "data", "result", "output", "response", "message", "content"):
            if key in value:
                nested = _extract_json_payload(value[key])
                if nested is not None:
                    return nested
        return None
    if isinstance(value, list):
        for item in value:
            nested = _extract_json_payload(item)
            if nested is not None:
                return nested
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if "</think>" in text:
            text = text.rsplit("</think>", 1)[-1]
        candidates: List[str] = []
        for match in JSON_BLOCK_PATTERN.finditer(text):
            candidates.append(match.group(1).strip())
        candidates.append(text)
        for candidate in candidates:
            if not candidate:
                continue
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
        return None
    return None


def _coerce_json_guess(payload: Dict[str, Any]) -> Dict[str, Any]:
    best_guess = payload.get("best_guess") or payload.get("guess") or payload.get("answer")
    if isinstance(best_guess, list):
        best_list = _ensure_str_list(best_guess)
        best_guess = best_list[0] if best_list else None
        alternatives = best_list[1:]
    else:
        alternatives = []

    if best_guess is not None and not isinstance(best_guess, str):
        best_guess = str(best_guess)

    additional_alternatives = _ensure_str_list(
        payload.get("alternatives")
        or payload.get("candidates")
        or payload.get("others")
        or payload.get("guesses")
    )

    if alternatives:
        existing_lower = {item.lower() for item in alternatives}
        combined = alternatives + [alt for alt in additional_alternatives if alt.lower() not in existing_lower]
    else:
        combined = additional_alternatives

    if not best_guess and combined:
        best_guess = combined[0]
        combined = combined[1:]

    confidence = _parse_float(payload.get("confidence") or payload.get("score") or payload.get("probability"))
    # Note: confidence is no longer used in the output format
    reason = payload.get("reason") or payload.get("explanation") or payload.get("analysis")

    seen_lower = set()
    if isinstance(best_guess, str):
        seen_lower.add(best_guess.lower())

    unique_alternatives: List[str] = []
    for alt in combined:
        lower = alt.lower()
        if lower in seen_lower:
            continue
        seen_lower.add(lower)
        unique_alternatives.append(alt)

    if reason is not None and not isinstance(reason, str):
        reason = str(reason)

    return {
        "best_guess": best_guess,
        "alternatives": unique_alternatives,
        "reason": reason,
    }


def _extract_guesses(data: Dict[str, Any]) -> Dict[str, Any]:
    structured = _extract_json_payload(data)
    if isinstance(structured, list):
        for item in structured:
            if isinstance(item, dict):
                structured = item
                break
        else:
            structured = None

    if isinstance(structured, dict):
        coerced = _coerce_json_guess(structured)
        if coerced.get("best_guess") or coerced.get("alternatives"):
            return coerced

    result = data.get("result") or data.get("results") or data.get("data")
    best_guess: Optional[str] = None
    alternatives: List[str] = []

    def _maybe_append(value: Any):
        nonlocal best_guess, alternatives
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
    }


def guess_drawing(
    image: str,
    clue: Optional[str] = None,
    config: Optional[Dict[str, Optional[str]]] = None,
    target: Optional[str] = None,
    call_preference: Optional[str] = None,
) -> Dict[str, Any]:
    """Call ERNIE model (or a custom endpoint) to guess the drawing content."""

    sanitized_config = _sanitize_config(config)
    prompt = _build_instruction(clue, sanitized_config.get("prompt"))

    # 根据调用偏好选择不同的调用方式
    if call_preference == "server":
        # 优先使用服务器端AI调用，失败时回退到自定义服务
        api_key = os.getenv("AI_STUDIO_API_KEY")
        if api_key:
            try:
                data = _call_ernie_inference(image, prompt, sanitized_config.get("model"))
                parsed = _extract_guesses(data)
                best_guess = parsed.get("best_guess")
                return {
                    "success": True,
                    "configured": True,
                    "best_guess": best_guess,
                    "alternatives": parsed.get("alternatives", []),
                    "reason": parsed.get("reason"),
                    "matched": _is_guess_correct(best_guess, target),
                    "target": target,
                    "raw": data,
                    "provider": "server",
                }
            except Exception as exc:
                # 服务器端AI调用失败，回退到自定义服务
                if sanitized_config.get("url"):
                    try:
                        data = _call_custom_model(image, prompt, sanitized_config)
                        parsed = _extract_guesses(data)
                        best_guess = parsed.get("best_guess")
                        return {
                            "success": True,
                            "configured": True,
                            "best_guess": best_guess,
                            "alternatives": parsed.get("alternatives", []),
                            "reason": f"服务器AI调用失败，已回退到自定义服务。{parsed.get('reason', '')}",
                            "matched": _is_guess_correct(best_guess, target),
                            "target": target,
                            "raw": data,
                            "provider": "custom_fallback",
                        }
                    except Exception as fallback_exc:
                        return {
                            "success": False,
                            "configured": True,
                            "best_guess": None,
                            "alternatives": [],
                            "error": f"服务器AI和自定义服务都调用失败。服务器错误: {str(exc)}, 自定义服务错误: {str(fallback_exc)}",
                            "reason": None,
                            "matched": False,
                            "target": target,
                            "provider": "server_fallback_failed",
                        }
                else:
                    return {
                        "success": False,
                        "configured": True,
                        "best_guess": None,
                        "alternatives": [],
                        "error": f"服务器AI调用失败，且未配置自定义服务作为备用。错误: {str(exc)}",
                        "reason": None,
                        "matched": False,
                        "target": target,
                        "provider": "server",
                    }
        else:
            # 服务器端AI未配置，直接使用自定义服务
            if sanitized_config.get("url"):
                try:
                    data = _call_custom_model(image, prompt, sanitized_config)
                    parsed = _extract_guesses(data)
                    best_guess = parsed.get("best_guess")
                    return {
                        "success": True,
                        "configured": True,
                        "best_guess": best_guess,
                        "alternatives": parsed.get("alternatives", []),
                        "reason": "服务器AI未配置，使用自定义服务",
                        "matched": _is_guess_correct(best_guess, target),
                        "target": target,
                        "raw": data,
                        "provider": "custom",
                    }
                except Exception as exc:
                    return {
                        "success": False,
                        "configured": True,
                        "best_guess": None,
                        "alternatives": [],
                        "error": str(exc),
                        "reason": None,
                        "matched": False,
                        "target": target,
                        "provider": "custom",
                    }
            else:
                return {
                    "success": False,
                    "configured": False,
                    "best_guess": None,
                    "alternatives": [],
                    "reason": "服务器AI和自定义服务都未配置",
                    "matched": False,
                    "target": target,
                    "raw": {"reason": "No AI service configured"},
                    "provider": "none",
                }
    
    elif call_preference == "custom" or sanitized_config.get("url"):
        # 使用自定义服务
        try:
            data = _call_custom_model(image, prompt, sanitized_config)
            parsed = _extract_guesses(data)
            best_guess = parsed.get("best_guess")
            return {
                "success": True,
                "configured": True,
                "best_guess": best_guess,
                "alternatives": parsed.get("alternatives", []),
                "reason": parsed.get("reason"),
                "matched": _is_guess_correct(best_guess, target),
                "target": target,
                "raw": data,
                "provider": "custom",
            }
        except Exception as exc:
            return {
                "success": False,
                "configured": True,
                "best_guess": None,
                "alternatives": [],
                "error": str(exc),
                "reason": None,
                "matched": False,
                "target": target,
                "provider": "custom",
            }

    # 默认逻辑：优先使用服务器端AI，如果没有则使用自定义配置
    api_key = os.getenv("AI_STUDIO_API_KEY")
    if api_key:
        try:
            data = _call_ernie_inference(image, prompt, sanitized_config.get("model"))
            parsed = _extract_guesses(data)
            best_guess = parsed.get("best_guess")
            return {
                "success": True,
                "configured": True,
                "best_guess": best_guess,
                "alternatives": parsed.get("alternatives", []),
                "reason": parsed.get("reason"),
                "matched": _is_guess_correct(best_guess, target),
                "target": target,
                "raw": data,
                "provider": "ernie",
            }
        except Exception as exc:
            return {
                "success": False,
                "configured": True,
                "best_guess": None,
                "alternatives": [],
                "error": str(exc),
                "reason": None,
                "matched": False,
                "target": target,
                "provider": "ernie",
            }

    # fallback heuristic when AI not configured
    return {
        "success": False,
        "configured": False,
        "best_guess": None,
        "alternatives": [],
        "reason": "AI服务未配置，无法进行图像识别",
        "matched": False,
        "target": target,
        "raw": {"reason": "AI service not configured"},
        "provider": "fallback",
    }
