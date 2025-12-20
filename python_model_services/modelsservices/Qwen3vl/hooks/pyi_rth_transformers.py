# Runtime hook for transformers
# This hook runs before the main application to set up transformers environment

import sys
import os

# Add the _internal directory to Python path
_internal_path = os.path.join(os.path.dirname(sys.executable), '_internal')
if _internal_path not in sys.path:
    sys.path.insert(0, _internal_path)

# Set environment variables that transformers might need
os.environ.setdefault('TRANSFORMERS_CACHE', os.path.join(os.path.dirname(sys.executable), 'cache'))

# CRITICAL: Disable transformers lazy loading to prevent frozenset() KeyError
os.environ['TRANSFORMERS_NO_LAZY_IMPORT'] = '1'

# Pre-import critical modules to avoid dynamic import issues
try:
    import importlib.metadata
    # Force importlib.metadata to use the packaged metadata
    importlib.metadata.__path__.insert(0, os.path.join(_internal_path, 'importlib_metadata'))
except:
    pass

print("Disabled transformers lazy loading (TRANSFORMERS_NO_LAZY_IMPORT=1)")

# Now try to import transformers normally
try:
    import transformers
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    print("Successfully imported transformers with lazy loading disabled")
except Exception as e:
    print(f"Warning: Failed to import transformers even with lazy loading disabled: {e}")
    # Fallback to monkey patching approach
    try:
        # Monkey patch the problematic import to avoid the frozenset error
        import transformers.utils.versions
        original_require_version = transformers.utils.versions.require_version
        original_require_version_core = transformers.utils.versions.require_version_core

        def patched_require_version(requirement, hint=""):
            try:
                return original_require_version(requirement, hint)
            except Exception as e:
                print(f"Warning: Failed to check version requirement {requirement}: {e}")
                # Return without raising error
                return

        def patched_require_version_core(requirement, hint=""):
            try:
                return original_require_version_core(requirement, hint)
            except Exception as e:
                print(f"Warning: Failed to check core version requirement {requirement}: {e}")
                # Return without raising error
                return

        transformers.utils.versions.require_version = patched_require_version
        transformers.utils.versions.require_version_core = patched_require_version_core

        # Also patch importlib.metadata.version to handle missing packages
        import importlib.metadata
        original_version = importlib.metadata.version

        def patched_version(package):
            try:
                return original_version(package)
            except Exception as e:
                print(f"Warning: Failed to get version for {package}: {e}")
                # Return a dummy version to avoid crashes
                return "0.0.0"

        importlib.metadata.version = patched_version

        print("Transformers runtime hook setup complete (fallback mode)")
    except Exception as e:
        print(f"Warning: Failed to setup transformers runtime hook: {e}")
        # Don't fail here, let the main application handle it