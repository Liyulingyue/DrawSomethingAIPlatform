#!/usr/bin/env python3
"""
Speed test script for Qwen3-VL model using OpenAI API.
"""

import argparse
import time
import openai

def test_speed_via_api(base_url="http://localhost:8000/v1", api_key="dummy", model="qwen3-vl-openvino", question="Describe this image.", num_runs=5):
    """Test inference speed via OpenAI API."""
    client = openai.OpenAI(
        api_key=api_key,
        base_url=base_url
    )

    print(f"Testing speed via API: {base_url}")
    print(f"Model: {model}")
    print(f"Question: {question}")
    print(f"Number of runs: {num_runs}")
    print("-" * 50)

    times = []

    for i in range(num_runs):
        start_time = time.time()

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user", "content": question}
                ],
                max_tokens=50
            )

            response_text = response.choices[0].message.content

        except Exception as e:
            print(f"Error in run {i+1}: {e}")
            continue

        end_time = time.time()
        inference_time = end_time - start_time
        times.append(inference_time)

        print(f"Run {i+1}: {inference_time:.2f}s")
    print("-" * 50)

    if not times:
        print("No successful runs!")
        return

    # Calculate statistics
    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    print("Speed Test Results (via API):")
    print(f"Average time: {avg_time:.2f}s")
    print(f"Min time: {min_time:.2f}s")
    print(f"Max time: {max_time:.2f}s")
    print(f"Total time: {sum(times):.2f}s")
    print(f"Requests per second: {len(times)/sum(times):.2f}")
def main():
    parser = argparse.ArgumentParser(description="Test inference speed for Qwen3-VL model via OpenAI API")
    parser.add_argument("--base_url", default="http://localhost:8000/v1", help="API base URL")
    parser.add_argument("--api_key", default="dummy", help="API key (not used)")
    parser.add_argument("--model", default="qwen3-vl-openvino", help="Model name")
    parser.add_argument("--question", default="Describe this image.", help="Question to ask")
    parser.add_argument("--num_runs", type=int, default=5, help="Number of test runs")

    args = parser.parse_args()

    test_speed_via_api(args.base_url, args.api_key, args.model, args.question, args.num_runs)

if __name__ == "__main__":
    main()