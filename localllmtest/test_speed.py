#!/usr/bin/env python3
"""
Test script for LLM inference speed.
This script measures the time taken to generate text, with optional vision input.
"""

import time
import requests
import json
import base64
import os

def test_speed():
    """Test the speed of text generation, with vision if test.png exists."""
    url = "http://127.0.0.1:8000/generate"
    prompt = "这是什么？"
    data = {
        "prompt": prompt,
        "max_tokens": 100,
        "temperature": 0.7
    }

    # Check for test.png and encode it
    image_path = "test.png"
    if os.path.exists(image_path):
        print("Found test.png, testing vision capabilities...")
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
        data["image"] = image_data
    else:
        print("No test.png found, testing text-only generation...")
        prompt = "你好，你怎么样？"
        data["prompt"] = prompt

    print("Testing LLM inference speed...")
    start_time = time.time()

    try:
        response = requests.post(url, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        end_time = time.time()

        elapsed = end_time - start_time
        generated_text = result["text"]
        tokens_generated = len(generated_text.split())  # Rough estimate

        print(".2f")
        print(".2f")
        print(f"Generated text: {generated_text[:100]}...")

    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        print("Make sure the server is running with 'python run_server.py'")

if __name__ == "__main__":
    test_speed()