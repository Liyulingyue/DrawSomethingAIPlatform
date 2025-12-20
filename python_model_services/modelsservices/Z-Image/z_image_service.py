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
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import psutil

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
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
    """Load the Z-Image model"""
    global model, is_model_loaded

    try:
        logger.info("Loading Z-Image model...")

        # Import here to avoid loading if not needed
        from diffusers import StableDiffusionPipeline
        import torch

        model_path = os.path.join(os.path.dirname(__file__), "models", "Z-Image-Turbo")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model path not found: {model_path}")

        # Load model with optimizations
        model = StableDiffusionPipeline.from_pretrained(
            model_path,
            torch_dtype=torch.float16,
            safety_checker=None,
            requires_safety_checker=False
        )

        # Use GPU if available
        if torch.cuda.is_available():
            model = model.to("cuda")
        else:
            model = model.to("cpu")

        is_model_loaded = True
        logger.info("Z-Image model loaded successfully")

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

    import threading
    threading.Thread(target=shutdown_server, daemon=True).start()

    return {"status": "shutting_down", "model": "Z-Image"}

@app.post("/images/generations")
async def generate_images(request: ImageGenerationRequest):
    """OpenAI-compatible image generation endpoint"""
    if not is_model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Please call /load first.")

    async with model_lock:
        try:
            # Process image generation request
            # This is a simplified implementation - you would need to implement
            # the actual model inference logic here

            # For now, return a mock response
            response = ImageGenerationResponse(
                created=int(time.time()),
                data=[{
                    "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",  # 1x1 transparent PNG
                    "revised_prompt": request.prompt
                }]
            )

            return response

        except Exception as e:
            logger.error(f"Error in image generation: {e}")
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