#!/usr/bin/env python3
"""
Model conversion and optimization script for Qwen3-VL using OpenVINO.
"""

import platform
from pathlib import Path
import ipywidgets as widgets
from utils import ensure_utils

# Ensure utility files are downloaded
ensure_utils()

from cmd_helper import optimum_cli
from huggingface_hub import snapshot_download

def select_model():
    """Select Qwen3-VL model variant."""
    model_ids = ["Qwen/Qwen3-VL-2B-Instruct", "Qwen/Qwen3-VL-4B-Instruct", "Qwen/Qwen3-VL-8B-Instruct"]

    model_id = widgets.Dropdown(
        options=model_ids,
        default=model_ids[0],
        description="Model:",
    )

    print(f"Selected {model_id.value}")
    return model_id.value

def download_model(model_id, local_dir):
    """Download model from Hugging Face to local directory."""
    if not local_dir.exists():
        print(f"Downloading model {model_id} to {local_dir}")
        snapshot_download(repo_id=model_id, local_dir=local_dir)
        print("Model download completed.")
    else:
        print(f"Model already exists at {local_dir}")
    return local_dir

def compression_options():
    """Configure weight compression options."""
    to_compress = widgets.Checkbox(
        value=True,
        description="Weight compression",
        disabled=False,
    )

    visible_widgets = [to_compress]
    options = widgets.VBox(visible_widgets)
    return options, to_compress

def convert_model(pt_model_id, compress=True, local_model_path=None):
    """Convert and optimize the model."""
    converted_base = Path("Models_Converted")
    converted_base.mkdir(exist_ok=True)  # Ensure the directory exists

    if local_model_path:
        # Use local model path for model name
        model_name = Path(local_model_path).name
    else:
        # Use Hugging Face model ID for model name
        model_name = pt_model_id.split("/")[-1]

    model_dir = converted_base / model_name

    additional_args = {}

    if compress:
        model_dir = model_dir / "INT4"
        additional_args.update({
            "task": "image-text-to-text",
            "weight-format": "int4",
            "group-size": "128",
            "ratio": "0.8"
        })
    else:
        model_dir = model_dir / "FP16"
        additional_args.update({
            "task": "image-text-to-text",
            "weight-format": "fp16"
        })

    if not model_dir.exists():
        print(f"Converting model {pt_model_id} to {model_dir}")
        print("This process may take several minutes depending on model size and system performance...")
        print("Please wait, conversion in progress...")
        
        # Use local path if provided, otherwise use model ID
        model_source = local_model_path if local_model_path else pt_model_id
        optimum_cli(model_source, model_dir, additional_args=additional_args)
        
        print("Model conversion completed successfully!")
        print(f"Converted model saved to: {model_dir}")
    else:
        print(f"Model already exists at {model_dir}")
        print("Skipping conversion.")

    return model_dir

if __name__ == "__main__":
    # For command line usage
    import argparse

    parser = argparse.ArgumentParser(description="Convert Qwen3-VL model to OpenVINO format")
    parser.add_argument("--model", default="Qwen/Qwen3-VL-2B-Instruct", help="Model ID")
    parser.add_argument("--compress", action="store_true", default=True, help="Enable weight compression")
    parser.add_argument("--download", action="store_true", help="Download model to local Models directory")
    parser.add_argument("--local_path", help="Local path to model (overrides download)")

    args = parser.parse_args()

    if args.download:
        local_model_dir = Path("Models") / args.model
        download_model(args.model, local_model_dir)
        local_path = str(local_model_dir)
    elif args.local_path:
        local_path = args.local_path
    else:
        local_path = None

    model_path = convert_model(args.model, args.compress, local_path)
    print(f"Model saved to: {model_path}")