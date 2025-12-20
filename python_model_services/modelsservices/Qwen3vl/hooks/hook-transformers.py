# PyInstaller hook for transformers
# This hook ensures all transformers submodules and metadata are included

from PyInstaller.utils.hooks import collect_submodules, collect_data_files, copy_metadata

# Collect all transformers submodules
hiddenimports = collect_submodules('transformers')

# Also collect data files if any
datas = collect_data_files('transformers')

# Add tokenizers
try:
    tokenizers_modules = collect_submodules('tokenizers')
    hiddenimports += tokenizers_modules
    datas += collect_data_files('tokenizers')
except:
    pass

hiddenimports += ['tokenizers', 'sentencepiece']

# Add tqdm and its data files
try:
    tqdm_modules = collect_submodules('tqdm')
    hiddenimports += tqdm_modules
    datas += collect_data_files('tqdm')
except:
    pass

# Add regex and its data files
try:
    regex_modules = collect_submodules('regex')
    hiddenimports += regex_modules
    datas += collect_data_files('regex')
except:
    pass

hiddenimports += ['regex']

# Add pyyaml/yaml
try:
    yaml_modules = collect_submodules('yaml')
    hiddenimports += yaml_modules
    datas += collect_data_files('yaml')
except:
    pass

hiddenimports += ['yaml', 'yaml.cyaml', 'yaml.loader', 'yaml.dumper']

# Explicitly add important hidden imports
important_imports = [
    'tqdm',
    'regex',
    'pyyaml',
    'yaml',
    'yaml.cyaml',
    'yaml.loader',
    'yaml.dumper',
    'tokenizers',
    'sentencepiece',
    'PIL',
    'PIL.Image',
    'numpy',
    'torch',
    'torchvision',
    'accelerate',
    'safetensors',
    'huggingface_hub',
    'packaging',
    'filelock',
    'requests',
    'urllib3',
    'idna',
]

for imp in important_imports:
    if imp not in hiddenimports:
        hiddenimports.append(imp)

# Copy metadata for all packages that transformers depends on
metadata_packages = [
    'transformers',
    'torch',
    'torchvision',
    'torchaudio',
    'tqdm',
    'sentencepiece',
    'tokenizers',
    'regex',
    'pyyaml',
    'PyYAML',
    'yaml',
    'packaging',
    'filelock',
    'requests',
    'charset-normalizer',
    'certifi',
    'urllib3',
    'idna',
    'Pillow',
    'accelerate',
    'safetensors',
    'huggingface_hub',
    'numpy',
    'scipy'
]

for pkg in metadata_packages:
    try:
        pkg_metadata = copy_metadata(pkg)
        datas += pkg_metadata
    except:
        pass