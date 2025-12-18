#!/usr/bin/env python3
"""
Test script for structured output capabilities of Qwen3-VL model via OpenAI API.
Based on backend/app/services/ai.py implementation.
"""

import argparse
import json
import re
import time
import openai
from pathlib import Path
from typing import Any, Dict, List, Optional

# Format instructions from backend
FORMAT_INSTRUCTIONS = (
    "请仅输出一个 JSON 代码块，严格按照如下格式返回：\n"
    "```json\n"
    "{\n"
    '  "best_guess": "最可能的词语或短语",\n'
    '  "alternatives": ["备选答案1", "备选答案2"],\n'
    '  "reason": "简要的解释"\n'
    "}\n"
    "```\n"
    "其中 alternatives 按可能性从高到低排列，如无可填空数组；不允许输出除上述 JSON 代码块之外的任何文字。"
)

DEFAULT_PROMPT = (
    "你是一位能够理解绘画的助手，请根据提供的图像推测其所表达的词语或短语，并生成答案。\n"
)

JSON_BLOCK_PATTERN = re.compile(r"```json\s*(.*?)\s*```", re.IGNORECASE | re.DOTALL)

def build_instruction(clue: Optional[str] = None, custom_prompt: Optional[str] = None, language: str = "zh") -> str:
    """Build instruction prompt similar to backend."""
    language = language or 'zh'
    LANGUAGE_PROMPT = f"当前界面语言是{language}。返回的json中，key需要保持不变，但value需要使用{language}回答。\n"

    sections: List[str] = []
    sections.append(DEFAULT_PROMPT)
    sections.append(LANGUAGE_PROMPT)

    if custom_prompt and custom_prompt.strip():
        sections.append(custom_prompt.strip())
    if clue:
        sections.append(f"猜词的参考线索：{clue}")
    sections.append(FORMAT_INSTRUCTIONS)

    return "\n\n".join(section for section in sections if section)

def extract_json_payload(value: Any) -> Optional[Any]:
    """Extract JSON payload from response, based on backend implementation."""
    if value is None:
        return None
    if isinstance(value, dict):
        keys = {key.lower() for key in value.keys()}
        if {"best_guess", "alternatives"} & keys:
            return value
        for key in ("json", "data", "result", "output", "response", "message", "content"):
            if key in value:
                nested = extract_json_payload(value[key])
                if nested is not None:
                    return nested
        return None
    if isinstance(value, list):
        for item in value:
            nested = extract_json_payload(item)
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

def coerce_json_guess(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Coerce JSON guess to standard format, based on backend."""
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

def _ensure_str_list(values: Any) -> List[str]:
    """Ensure values is a list of strings."""
    if values is None:
        return []
    if isinstance(values, str):
        return _normalize_candidate_text(values)
    if isinstance(values, list):
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

def _normalize_candidate_text(text: str) -> List[str]:
    """Normalize candidate text."""
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

def extract_guesses(data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract guesses from response data."""
    structured = extract_json_payload(data)
    if isinstance(structured, list):
        for item in structured:
            if isinstance(item, dict):
                structured = item
                break
        else:
            structured = None

    if isinstance(structured, dict):
        coerced = coerce_json_guess(structured)
        if coerced.get("best_guess") or coerced.get("alternatives"):
            return coerced

    # Fallback: try to extract from raw text
    if isinstance(data, dict) and "result" in data:
        raw_text = data["result"]
        structured = extract_json_payload(raw_text)
        if structured:
            coerced = coerce_json_guess(structured)
            if coerced.get("best_guess") or coerced.get("alternatives"):
                return coerced

    return {
        "best_guess": None,
        "alternatives": [],
        "reason": "无法解析结构化输出"
    }

def test_structured_output_via_api(base_url="http://localhost:8000/v1", api_key="dummy", model="qwen3-vl-openvino", clue=None, custom_prompt=None, language="zh", max_tokens=200):
    """Test structured output capabilities via OpenAI API."""
    client = openai.OpenAI(
        api_key=api_key,
        base_url=base_url
    )

    print(f"🔍 测试结构化输出 via API: {base_url}")
    print(f"🤖 模型: {model}")
    if clue:
        print(f"💡 线索: {clue}")
    print(f"🌐 语言: {language}")
    print("-" * 60)

    # Build instruction
    instruction = build_instruction(clue, custom_prompt, language)
    print(f"📝 构建指令完成 (长度: {len(instruction)} 字符)")

    # Run inference via API
    print("🤖 正在通过 API 运行推理...")
    start_time = time.time()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": instruction}
            ],
            max_tokens=max_tokens
        )

        response_text = response.choices[0].message.content
        inference_time = time.time() - start_time
        print(f"✅ API 推理完成 (耗时: {inference_time:.2f} 秒)")

    except Exception as e:
        inference_time = time.time() - start_time
        print(f"❌ API 调用失败 (耗时: {inference_time:.2f} 秒): {e}")
        return None

    print("-" * 60)

    # Parse response
    print("🔍 解析响应...")
    parse_start_time = time.time()
    mock_data = {"result": response_text}
    parsed_result = extract_guesses(mock_data)
    parse_time = time.time() - parse_start_time
    print(f"✅ 解析完成 (耗时: {parse_time:.3f} 秒)")

    print("📊 解析结果:")
    print(f"  最佳猜测: {parsed_result.get('best_guess', '无')}")
    print(f"  备选答案: {parsed_result.get('alternatives', [])}")
    print(f"  原因: {parsed_result.get('reason', '无')}")
    print("-" * 60)

    print("📄 原始响应:")
    print(response_text)
    print("-" * 60)

    # Validate structure
    has_best_guess = parsed_result.get('best_guess') is not None
    has_alternatives = len(parsed_result.get('alternatives', [])) > 0
    has_reason = parsed_result.get('reason') is not None

    print("✅ 结构验证:")
    print(f"  包含最佳猜测: {'是' if has_best_guess else '否'}")
    print(f"  包含备选答案: {'是' if has_alternatives else '否'}")
    print(f"  包含原因: {'是' if has_reason else '否'}")

    success = has_best_guess and has_alternatives and has_reason
    print(f"🎯 结构化输出测试: {'通过' if success else '失败'}")

    # Print timing summary
    total_time = inference_time + parse_time
    print("-" * 60)
    print("⏱️  时间统计:")
    print(f"  API 推理时间: {inference_time:.2f} 秒")
    print(f"  响应解析时间: {parse_time:.3f} 秒")
    print(f"  总耗时: {total_time:.2f} 秒")

    return parsed_result

def main():
    parser = argparse.ArgumentParser(description="Test structured output capabilities of Qwen3-VL model via OpenAI API")
    parser.add_argument("--base_url", default="http://localhost:8000/v1", help="API base URL")
    parser.add_argument("--api_key", default="dummy", help="API key (not used)")
    parser.add_argument("--model", default="qwen3-vl-openvino", help="Model name")
    parser.add_argument("--clue", help="Clue for guessing")
    parser.add_argument("--custom_prompt", help="Custom prompt")
    parser.add_argument("--language", default="zh", help="Language (zh/en)")
    parser.add_argument("--max_tokens", type=int, default=200, help="Max tokens for response")

    args = parser.parse_args()

    test_structured_output_via_api(
        args.base_url,
        args.api_key,
        args.model,
        args.clue,
        args.custom_prompt,
        args.language,
        args.max_tokens
    )

if __name__ == "__main__":
    main()