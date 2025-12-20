#!/usr/bin/env python3
"""
Test script for Qwen3VL API structured output
"""

import requests
import json
import time
from typing import Dict, Any

def test_structured_output(base_url: str = "http://localhost:8000/v1", clue: str = "动物"):
    """Test structured output with JSON format"""
    url = f"{base_url}/chat/completions"

    system_prompt = """你是一个有帮助的AI助手。请根据用户提供的线索，生成一个结构化的JSON响应。

响应格式必须是：
{
  "category": "类别",
  "description": "详细描述",
  "examples": ["例子1", "例子2", "例子3"]
}

请确保响应是有效的JSON格式。"""

    payload = {
        "model": "qwen3vl",
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": f"请根据线索'{clue}'生成结构化响应。"
            }
        ],
        "max_tokens": 200
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        print(f"Testing structured output with clue: {clue}")
        start_time = time.time()

        response = requests.post(url, json=payload, headers=headers, timeout=60)

        end_time = time.time()
        api_time = end_time - start_time

        if response.status_code == 200:
            result = response.json()
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')

            print(f"✅ API call successful! Time: {api_time:.2f}s")
            print(f"Raw response: {content}")

            # Try to parse as JSON
            try:
                parsed_json = json.loads(content)
                print("✅ Response is valid JSON!")

                # Validate structure
                required_keys = ['category', 'description', 'examples']
                if all(key in parsed_json for key in required_keys):
                    print("✅ Response has required structure!")
                    print(f"Category: {parsed_json['category']}")
                    print(f"Description: {parsed_json['description']}")
                    print(f"Examples: {parsed_json['examples']}")
                    return True
                else:
                    print("❌ Response missing required keys")
                    return False

            except json.JSONDecodeError as e:
                print(f"❌ Response is not valid JSON: {e}")
                return False

        else:
            print(f"❌ API call failed! Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Test Qwen3VL API structured output")
    parser.add_argument("--base_url", default="http://localhost:8000/v1", help="Base URL of the API server")
    parser.add_argument("--clue", default="动物", help="Clue for structured output test")

    args = parser.parse_args()

    print("🧪 Testing Qwen3VL API Structured Output")
    print("=" * 50)

    success = test_structured_output(args.base_url, args.clue)

    print("=" * 50)
    if success:
        print("🎉 Structured output test passed!")
    else:
        print("💥 Structured output test failed!")
        exit(1)