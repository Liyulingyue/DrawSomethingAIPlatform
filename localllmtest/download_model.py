#!/usr/bin/env python3
"""
Download script for Qwen3-VL-2B-Instruct-GGUF model and related files.
This script downloads the entire repository from Hugging Face.
"""

import os
from huggingface_hub import snapshot_download

def download_model():
    """Download the entire Qwen3-VL-2B-Instruct-GGUF repository."""
    repo_id = "Qwen/Qwen3-VL-2B-Instruct-GGUF"

    print(f"Downloading entire repository {repo_id}...")

    try:
        # Download all files from the repository
        local_dir = snapshot_download(repo_id=repo_id, local_dir=".", ignore_patterns=["*.md", "*.txt"])  # Skip documentation files
        print(f"Downloaded to: {local_dir}")

        # Check for required files
        gguf_files = [f for f in os.listdir(local_dir) if f.endswith('.gguf')]
        mmproj_files = [f for f in os.listdir(local_dir) if f.endswith('.mmproj')]

        if gguf_files:
            print(f"Found GGUF files: {gguf_files}")
            # Assume the first one is the model
            model_file = gguf_files[0]
            if not os.path.exists("model.gguf"):
                os.rename(model_file, "model.gguf")
                print(f"Renamed {model_file} to model.gguf")
        else:
            print("Warning: No GGUF files found!")

        if mmproj_files:
            print(f"Found MMPROJ files: {mmproj_files}")
            # Assume the first one is the projector
            mmproj_file = mmproj_files[0]
            if not os.path.exists("mmproj.gguf"):
                os.rename(mmproj_file, "mmproj.gguf")
                print(f"Renamed {mmproj_file} to mmproj.gguf")
        else:
            print("Warning: No MMPROJ files found! Vision features may not work.")

    except Exception as e:
        print(f"Error downloading repository: {e}")
        print("Please download manually from https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF")

if __name__ == "__main__":
    download_model()