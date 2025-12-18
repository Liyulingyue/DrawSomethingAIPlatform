#!/usr/bin/env python3
"""
Inference script for Qwen3-VL model using OpenVINO.
"""

import argparse
from pathlib import Path
from PIL import Image
import requests
from transformers import AutoProcessor, TextStreamer
from optimum.intel.openvino import OVModelForVisualCausalLM
from utils import ensure_utils

# Ensure utility files are downloaded
ensure_utils()

from notebook_utils import device_widget

def load_model(model_dir, device="AUTO"):
    """Load the OpenVINO model."""
    print(f"Loading model from {model_dir} on device {device}")
    model = OVModelForVisualCausalLM.from_pretrained(model_dir, device=device)

    min_pixels = 256 * 28 * 28
    max_pixels = 1280 * 28 * 28
    processor = AutoProcessor.from_pretrained(model_dir, min_pixels=min_pixels, max_pixels=max_pixels)

    return model, processor

def run_inference(model, processor, image_path_or_url, question, max_new_tokens=100):
    """Run inference on an image with a question."""
    # Handle image input
    if image_path_or_url.startswith("http"):
        image = Image.open(requests.get(image_path_or_url, stream=True).raw)
    else:
        image = Image.open(image_path_or_url)

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "url": image_path_or_url,
                },
                {"type": "text", "text": question},
            ],
        }
    ]

    # Prepare inputs
    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt"
    )

    print("Question:", question)
    print("Answer:")

    # Generate response
    generated_ids = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        streamer=TextStreamer(processor.tokenizer, skip_prompt=True, skip_special_tokens=True)
    )

    return generated_ids

def main():
    parser = argparse.ArgumentParser(description="Run Qwen3-VL inference")
    parser.add_argument("--model_path", required=True, help="Path to converted model")
    parser.add_argument("--device", default="AUTO", help="Inference device")
    parser.add_argument("--image", default="https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen-VL/assets/demo.jpeg",
                       help="Image path or URL")
    parser.add_argument("--question", default="Describe this image.", help="Question to ask")
    parser.add_argument("--max_tokens", type=int, default=100, help="Max new tokens")

    args = parser.parse_args()

    # Load model
    model, processor = load_model(args.model_path, args.device)

    # Run inference
    result = run_inference(model, processor, args.image, args.question, args.max_tokens)

    print("Inference completed.")

if __name__ == "__main__":
    main()