"""
PyInstaller hook for torch.cuda compatibility
"""

import os
import sys
from PyInstaller.utils.hooks import collect_submodules

# Disable CUDA
os.environ['CUDA_VISIBLE_DEVICES'] = ''
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = ''

# Create mock torch.cuda module before torch is imported
def pre_safe_import_module(api):
    """Pre-safe import hook to handle torch.cuda"""
    try:
        import types

        # Create a mock torch.cuda module
        cuda_mock = types.ModuleType('torch.cuda')
        cuda_mock.is_available = lambda: False
        cuda_mock.device_count = lambda: 0
        cuda_mock.current_device = lambda: 0
        cuda_mock.get_device_name = lambda x: "CPU"
        cuda_mock.set_device = lambda x: None
        cuda_mock.synchronize = lambda: None
        cuda_mock.empty_cache = lambda: None

        # Add it to sys.modules before torch imports it
        if 'torch.cuda' not in sys.modules:
            sys.modules['torch.cuda'] = cuda_mock

    except Exception as e:
        pass  # Ignore any errors in hook

# Run the hook
pre_safe_import_module(None)