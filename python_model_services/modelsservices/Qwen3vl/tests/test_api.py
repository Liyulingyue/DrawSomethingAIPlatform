#!/usr/bin/env python3
"""
Test script for Qwen3VL API basic functionality
"""

import requests
import json
import time
from typing import Dict, Any

import argparse

def test_chat_completion(base_url: str = "http://localhost:8000/v1"):
    """Test basic chat completion"""
    url = f"{base_url}/chat/completions"

    payload = {
        "model": "qwen3vl",
        "messages": [
            {
                "role": "user",
                "content": "Hello, can you describe what you see in this image? [No image provided for this test]"
            }
        ],
        "max_tokens": 100
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        print("Testing chat completion...")
        start_time = time.time()

        response = requests.post(url, json=payload, headers=headers, timeout=30)

        end_time = time.time()
        response_time = end_time - start_time

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Response time: {response_time:.2f}s")
            print(f"Response: {result.get('choices', [{}])[0].get('message', {}).get('content', '')[:200]}...")
            return True
        else:
            print(f"❌ Failed! Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_health_check(base_url: str = "http://localhost:8000"):
    """Test health check endpoint"""
    url = f"{base_url}/health"

    try:
        print("Testing health check...")
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            print("✅ Health check passed!")
            return True
        else:
            print(f"❌ Health check failed! Status: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_load_model(base_url: str = "http://localhost:8000"):
    """Test model loading"""
    url = f"{base_url}/load"

    try:
        print("Testing model loading...")
        response = requests.post(url, timeout=300)  # Longer timeout for model loading

        if response.status_code == 200:
            result = response.json()
            status = result.get("status")
            if status in ["loaded", "already_loaded"]:
                print("✅ Model loaded successfully!")
                return True
            else:
                print(f"❌ Unexpected status: {status}")
                return False
        else:
            print(f"❌ Failed to load model! Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False

def test_unload_model(base_url: str = "http://localhost:8000"):
    """Test model unloading"""
    url = f"{base_url}/unload"

    try:
        print("Testing model unloading...")
        response = requests.post(url, timeout=30)

        if response.status_code == 200:
            result = response.json()
            status = result.get("status")
            if status == "unloaded":
                print("✅ Model unloaded successfully!")
                return True
            elif status == "not_loaded":
                print("ℹ️  Model was not loaded")
                return True
            else:
                print(f"❌ Unexpected status: {status}")
                return False
        else:
            print(f"❌ Failed to unload model! Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error unloading model: {e}")
        return False
    

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Qwen3VL API")
    parser.add_argument("--base_url", default="http://localhost:8003", help="Base URL of the API server")
    parser.add_argument("--skip_health", action="store_true", help="Skip health check")
    parser.add_argument("--skip_load", action="store_true", help="Skip model loading")
    parser.add_argument("--test_unload", action="store_true", help="Test model unloading after completion")    
    args = parser.parse_args()

    print("🧪 Testing Qwen3VL API")
    print("=" * 50)

    success = True

    if not args.skip_health:
        success &= test_health_check(args.base_url)

    success &= test_load_model(args.base_url) if not args.skip_load else True
    success &= test_chat_completion(args.base_url)

    if args.test_unload:
        success &= test_unload_model(args.base_url)

    print("=" * 50)
    if success:
        print("🎉 All tests passed!")
    else:
        print("💥 Some tests failed!")
        exit(1)