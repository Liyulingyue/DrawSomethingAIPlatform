#!/usr/bin/env python3
"""
Z-Image Local Model Service
OpenAI-compatible API for Z-Image text-to-image model
"""

import os
import sys
import json
import time
import socket
import signal
import asyncio
import logging
import threading
import traceback
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager
import base64
from io import BytesIO

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# OpenVINO and ML imports
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''  # Disable CUDA
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = ''  # Disable CUDA memory allocator

from optimum.intel import OVZImagePipeline

# Handle torch.cuda import issue
try:
    import torch
    # Try to access torch.cuda to see if it's available
    torch.cuda.is_available()
except (ImportError, AttributeError):
    # If torch.cuda is not available, create a mock module
    import sys
    import types
    
    # Create a mock torch.cuda module
    cuda_mock = types.ModuleType('torch.cuda')
    cuda_mock.is_available = lambda: False
    cuda_mock.device_count = lambda: 0
    cuda_mock.current_device = lambda: 0
    cuda_mock.get_device_name = lambda x: "CPU"
    cuda_mock.set_device = lambda x: None
    
    # Add it to torch module
    if hasattr(torch, 'cuda'):
        # Replace existing cuda module
        sys.modules['torch.cuda'] = cuda_mock
    else:
        # Add cuda module to torch
        torch.cuda = cuda_mock
        sys.modules['torch.cuda'] = cuda_mock

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s socket- %(message)s')
logger = logging.getLogger(__name__)

# Global variables
model = None
is_model_loaded = False
model_lock = asyncio.Lock()

class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    model: Optional[str] = Field("z-image", description="Model name")
    size: Optional[str] = Field("512x512", description="Image size")
    n: Optional[int] = Field(1, description="Number of images to generate")

class ImageGenerationResponse(BaseModel):
    created: int
    data: List[Dict[str, Any]]

def find_available_port(start_port: int = 8004, max_attempts: int = 100) -> int:
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"No available ports found between {start_port} and {start_port + max_attempts}")

def load_model():
    """Load the Z-Image model with OpenVINO"""
    global model, is_model_loaded

    try:
        logger.info("Loading Z-Image model with OpenVINO...")

        # Try different model paths
        model_path = os.path.join(os.path.dirname(__file__), "models", "Z-Image-Turbo")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model path not found: {model_path}")

        logger.info(f"Loading model from: {model_path}")

        # Load OpenVINO optimized model
        model = OVZImagePipeline.from_pretrained(
            model_path,
            device="cpu"  # Force CPU for compatibility
        )

        is_model_loaded = True
        logger.info("Z-Image OpenVINO model loaded successfully")

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

def unload_model():
    """Unload the model to free memory"""
    global model, is_model_loaded

    try:
        logger.info("Unloading Z-Image model...")

        if model is not None:
            del model
            model = None

        is_model_loaded = False

        # Force garbage collection
        import gc
        gc.collect()

        logger.info("Z-Image model unloaded successfully")

    except Exception as e:
        logger.error(f"Failed to unload model: {e}")
        raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Z-Image service...")
    yield
    logger.info("Shutting down Z-Image service...")
    unload_model()

# Create FastAPI app
app = FastAPI(
    title="Z-Image Local Model Service",
    description="OpenAI-compatible API for Z-Image text-to-image model",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": is_model_loaded,
        "model_type": "Z-Image",
        "service": "image"
    }

@app.post("/load")
async def load_model_endpoint():
    """Load the model"""
    async with model_lock:
        if is_model_loaded:
            return {"status": "already_loaded", "model": "Z-Image"}

        try:
            load_model()
            return {"status": "loaded", "model": "Z-Image"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@app.post("/unload")
async def unload_model_endpoint():
    """Unload the model"""
    async with model_lock:
        if not is_model_loaded:
            return {"status": "not_loaded", "model": "Z-Image"}

        try:
            unload_model()
            return {"status": "unloaded", "model": "Z-Image"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to unload model: {str(e)}")

@app.post("/shutdown")
async def shutdown():
    """Shutdown the service"""
    logger.info("Shutdown requested via API")
    unload_model()

    # Schedule shutdown
    def shutdown_server():
        time.sleep(1)  # Give time for response
        os.kill(os.getpid(), signal.SIGTERM)

    threading.Thread(target=shutdown_server, daemon=True).start()

    return {"status": "shutting_down", "model": "Z-Image"}

@app.post("/images/generations")
async def generate_images(request: ImageGenerationRequest):
    """OpenAI-compatible image generation endpoint using OpenVINO"""
    if not is_model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Please call /load first.")

    async with model_lock:
        try:
            # Parse size parameter
            if request.size:
                try:
                    width, height = map(int, request.size.split('x'))
                except ValueError:
                    width, height = 512, 512  # default
            else:
                width, height = 512, 512  # default

            logger.info(f"Generating image with prompt: {request.prompt[:50]}...")
            logger.info(f"Image size: {width}x{height}")

            start_time = time.time()

            # Generate image using OpenVINO pipeline
            # Z-Image Turbo specific parameters
            generated_images = model(
                prompt=request.prompt,
                height=height,
                width=width,
                num_inference_steps=9,  # Z-Image Turbo optimized steps
                guidance_scale=0.0,     # Turbo model uses 0 guidance
                generator=torch.Generator("cpu").manual_seed(42),
            ).images

            end_time = time.time()
            generation_time = end_time - start_time
            logger.info(f"Image generated in {generation_time:.2f} seconds")

            # Convert images to base64
            image_data = []
            for i, image in enumerate(generated_images):
                # Convert PIL image to base64
                buffer = BytesIO()
                image.save(buffer, format="PNG")
                image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

                image_data.append({
                    "url": f"data:image/png;base64,{image_base64}",
                    "revised_prompt": request.prompt
                })

            response = ImageGenerationResponse(
                created=int(time.time()),
                data=image_data
            )

            return response

        except Exception as e:
            logger.error(f"Error in image generation: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "object": "list",
        "data": [{
            "id": "z-image-turbo",
            "object": "model",
            "created": int(time.time()),
            "owned_by": "local"
        }]
    }

def main():
    """Main entry point"""
    try:
        # Find available port
        port = find_available_port(8004)
        logger.info(f"Starting Z-Image service on port {port}")

        # Print port information for Tauri to parse
        print(f"[PORT] {port}")
        print(f"Z-Image Text-to-Image Service starting on http://localhost:{port}")
        print("Ready to serve requests...")

        # Start server
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=port,
            log_level="info"
        )

    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()