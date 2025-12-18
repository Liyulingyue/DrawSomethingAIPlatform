#!/usr/bin/env python3
"""
Utility functions for OpenVINO Qwen3-VL implementation.
"""

import platform
from pathlib import Path
import requests

def download_file(url, filename):
    """Download a file from URL."""
    response = requests.get(url, stream=True)
    response.raise_for_status()

    with open(filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

def ensure_utils():
    """Ensure utility files are downloaded."""
    if not Path("cmd_helper.py").exists():
        print("Downloading cmd_helper.py...")
        r = requests.get(url="https://raw.githubusercontent.com/openvinotoolkit/openvino_notebooks/latest/utils/cmd_helper.py")
        with open("cmd_helper.py", "w") as f:
            f.write(r.text)

    if not Path("notebook_utils.py").exists():
        print("Downloading notebook_utils.py...")
        r = requests.get(url="https://raw.githubusercontent.com/openvinotoolkit/openvino_notebooks/latest/utils/notebook_utils.py")
        with open("notebook_utils.py", "w") as f:
            f.write(r.text)

def collect_telemetry(notebook_name):
    """Collect telemetry (placeholder)."""
    # This is a placeholder for telemetry collection
    # In the original notebook, it collects usage data
    pass

def device_widget(default="AUTO", exclude=None):
    """Create a device selection widget (simplified for CLI)."""
    if exclude is None:
        exclude = []

    try:
        import openvino as ov
        core = ov.Core()
        devices = [d for d in core.available_devices if d not in exclude]
    except ImportError:
        devices = ["CPU"]

    # For CLI, just return the default
    class DeviceWidget:
        def __init__(self, value):
            self.value = value

    return DeviceWidget(default)

def setup_environment():
    """Setup environment-specific configurations."""
    if platform.system() == "Darwin":
        # macOS specific setup
        print("Running on macOS - ensuring numpy compatibility")
        # Could add numpy version check here

if __name__ == "__main__":
    ensure_utils()
    print("Utils setup completed.")