#!/usr/bin/env python3
"""
OpenVINO model utilities for Qwen3-VL.
"""

from pathlib import Path
from PIL import Image
import requests
from transformers import AutoProcessor
from optimum.intel.openvino import OVModelForVisualCausalLM

def load_model(model_path, device="AUTO"):
    """
    Load Qwen3-VL model with OpenVINO.

    Args:
        model_path (str): Path to the converted model directory
        device (str): Inference device (AUTO, CPU, GPU, etc.)

    Returns:
        tuple: (model, processor)
    """
    model_dir = Path(model_path)

    if not model_dir.exists():
        raise FileNotFoundError(f"Model directory {model_dir} does not exist. Please run convert_model.py first.")

    print(f"Loading model from {model_dir} on device {device}")

    model = OVModelForVisualCausalLM.from_pretrained(model_dir, device=device)

    min_pixels = 256 * 28 * 28
    max_pixels = 1280 * 28 * 28
    processor = AutoProcessor.from_pretrained(model_dir, min_pixels=min_pixels, max_pixels=max_pixels)

    return model, processor

def prepare_inputs(processor, image_path_or_url, question):
    """
    Prepare model inputs from image and question.

    Args:
        processor: Model processor
        image_path_or_url (str): Path to image file or URL
        question (str): Text question

    Returns:
        dict: Processed inputs
    """
    # Handle image
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

    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt"
    )

    return inputs, image

def run_inference(model, processor, image_path_or_url, question, max_new_tokens=100, stream=False):
    """
    Run inference on image and question.

    Args:
        model: Loaded OpenVINO model
        processor: Model processor
        image_path_or_url (str): Path to image or URL
        question (str): Question text
        max_new_tokens (int): Maximum tokens to generate
        stream (bool): Whether to stream output

    Returns:
        str: Generated response
    """
    inputs, image = prepare_inputs(processor, image_path_or_url, question)

    if stream:
        from transformers import TextStreamer
        streamer = TextStreamer(processor.tokenizer, skip_prompt=True, skip_special_tokens=True)
        generated_ids = model.generate(**inputs, max_new_tokens=max_new_tokens, streamer=streamer)
        return None  # Response is streamed
    else:
        generated_ids = model.generate(**inputs, max_new_tokens=max_new_tokens)
        response = processor.tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        return response

def get_available_devices():
    """Get list of available OpenVINO devices."""
    try:
        import openvino as ov
        core = ov.Core()
        return list(core.available_devices)
    except ImportError:
        return ["CPU"]  # Fallback

if __name__ == "__main__":
    # Example usage
    devices = get_available_devices()
    print("Available devices:", devices)