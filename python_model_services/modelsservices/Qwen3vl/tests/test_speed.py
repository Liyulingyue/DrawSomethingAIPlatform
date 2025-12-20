#!/usr/bin/env python3
"""
Speed test script for Qwen3VL API
"""

import requests
import json
import time
import statistics
from typing import List, Dict, Any

def run_speed_test(base_url: str = "http://localhost:8000/v1", num_runs: int = 5):
    """Run speed test for chat completion"""
    url = f"{base_url}/chat/completions"

    payload = {
        "model": "qwen3vl",
        "messages": [
            {
                "role": "user",
                "content": "Please respond with a short greeting."
            }
        ],
        "max_tokens": 50
    }

    headers = {
        "Content-Type": "application/json"
    }

    response_times: List[float] = []
    successful_runs = 0

    print(f"Running speed test with {num_runs} requests...")
    print("-" * 50)

    for i in range(num_runs):
        try:
            start_time = time.time()

            response = requests.post(url, json=payload, headers=headers, timeout=60)

            end_time = time.time()
            response_time = end_time - start_time

            if response.status_code == 200:
                response_times.append(response_time)
                successful_runs += 1
                print(".4f"            else:
                print(f"Request {i+1}: Failed (Status: {response.status_code})")

        except Exception as e:
            print(f"Request {i+1}: Error - {e}")

        # Small delay between requests
        time.sleep(0.5)

    print("-" * 50)

    if successful_runs > 0:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)

        print("📊 Speed Test Results:"        print(".4f"        print(".4f"        print(".4f"        print(f"Successful runs: {successful_runs}/{num_runs}")

        if successful_runs >= num_runs * 0.8:  # 80% success rate
            print("✅ Performance acceptable!")
            return True
        else:
            print("⚠️  Low success rate")
            return False
    else:
        print("❌ No successful requests")
        return False

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Speed test for Qwen3VL API")
    parser.add_argument("--base_url", default="http://localhost:8000/v1", help="Base URL of the API server")
    parser.add_argument("--num_runs", type=int, default=5, help="Number of test runs")

    args = parser.parse_args()

    print("🚀 Qwen3VL API Speed Test")
    print("=" * 50)

    success = run_speed_test(args.base_url, args.num_runs)

    if not success:
        exit(1)