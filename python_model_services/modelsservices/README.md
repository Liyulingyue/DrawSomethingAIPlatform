# Model Services Directory

This directory contains local AI model services that will be bundled and packaged for local service calls.

## Directory Structure

- **Qwen3vl/**: Directory for Qwen3VL vision model service
- **Z-Image/**: Directory for Z-Image text-to-image model service

## Service Specifications

Each model service provides an OpenAI-compatible REST API with the following endpoints:

### Common Endpoints

- `GET /health` - Health check
- `POST /load` - Load model into memory
- `POST /unload` - Unload model from memory
- `POST /shutdown` - Shutdown the service
- `GET /models` - List available models

### Qwen3VL Service (Vision Model)

**Location**: `Qwen3vl/qwen3vl_service.py`
**Default Port**: 8003 (auto-increment if occupied)
**API Endpoints**:
- `POST /chat/completions` - OpenAI-compatible chat completions for vision tasks

**Requirements**: See `Qwen3vl/requirements.txt`

### Z-Image Service (Text-to-Image Model)

**Location**: `Z-Image/z_image_service.py`
**Default Port**: 8004 (auto-increment if occupied)
**API Endpoints**:
- `POST /images/generations` - OpenAI-compatible image generation

**Requirements**: See `Z-Image/requirements.txt`

## Usage

### Running Services

1. **Install dependencies**:
   ```bash
   # For Qwen3VL
   cd Qwen3vl
   pip install -r requirements.txt

   # For Z-Image
   cd ../Z-Image
   pip install -r requirements.txt
   ```

2. **Place model files**:
   - Qwen3VL models should be in `Qwen3vl/models/Qwen3-VL-2B-Instruct/`
   - Z-Image models should be in `Z-Image/models/Z-Image-Turbo/`

3. **Run services**:
   ```bash
   # Qwen3VL service
   python qwen3vl_service.py

   # Z-Image service
   python z_image_service.py
   ```

### API Usage

#### Health Check
```bash
curl http://localhost:8003/health
# Response: {"status": "healthy", "model_loaded": false, "model_type": "Qwen3VL", "service": "vision"}
```

#### Load Model
```bash
curl -X POST http://localhost:8003/load
# Response: {"status": "loaded", "model": "Qwen3VL"}
```

#### Chat Completion (Qwen3VL)
```bash
curl -X POST http://localhost:8003/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3vl-vision",
    "messages": [{"role": "user", "content": "Describe this image"}],
    "max_tokens": 100
  }'
```

#### Image Generation (Z-Image)
```bash
curl -X POST http://localhost:8004/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "size": "512x512"
  }'
```

## Integration with Tauri

These services are designed to be started by the Tauri application. The services will:

1. Automatically find available ports starting from their default ports
2. Output `[PORT] <port_number>` for Tauri to parse
3. Provide OpenAI-compatible APIs for seamless integration

## Important Notes

⚠️ **GitHub Upload Policy**: The model files stored in this directory are for local service calls and **should NOT be uploaded to GitHub**. These directories contain large AI model files that:

- Are typically very large (GBs in size)
- May have licensing restrictions
- Are not suitable for version control
- Should be downloaded/obtained separately by users

Please ensure that `modelsservices/` is added to `.gitignore` to prevent accidental uploads of model files.

## Development Notes

- Services include mock responses for API compatibility testing
- Actual model inference logic needs to be implemented in the respective service files
- Services handle graceful shutdown and model memory management
- Port conflicts are automatically resolved by finding available ports