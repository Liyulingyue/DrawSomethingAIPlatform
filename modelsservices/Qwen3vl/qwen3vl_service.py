#!/usr/bin/env python3
"""
Qwen3VL Local Model Service
OpenAI-compatible API for Qwen3VL vision model
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
tokenizer = None
is_model_loaded = False
model_lock = asyncio.Lock()

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender")
    content: str | List[Dict[str, Any]] = Field(..., description="Content of the message")

class ChatCompletionRequest(BaseModel):
    model: str = Field(..., description="Model name")
    messages: List[ChatMessage] = Field(..., description="List of messages")
    max_tokens: Optional[int] = Field(1000, description="Maximum tokens to generate")
    temperature: Optional[float] = Field(0.7, description="Sampling temperature")
    stream: Optional[bool] = Field(False, description="Whether to stream the response")

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]

def find_available_port(start_port: int = 8003, max_attempts: int = 100) -> int:
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
    """Load the Qwen3VL model"""
    global model, tokenizer, is_model_loaded

    try:
        logger.info("Loading Qwen3VL model...")

        # Import here to avoid loading if not needed
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        model_path = os.path.join(os.path.dirname(__file__), "models", "Qwen3-VL-2B-Instruct")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model path not found: {model_path}")

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)

        # Load model with optimizations
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            trust_remote_code=True,
            torch_dtype=torch.float16,
            device_map="auto",
            low_cpu_mem_usage=True
        )

        is_model_loaded = True
        logger.info("Qwen3VL model loaded successfully")

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

def unload_model():
    """Unload the model to free memory"""
    global model, tokenizer, is_model_loaded

    try:
        logger.info("Unloading Qwen3VL model...")

        if model is not None:
            del model
            model = None

        if tokenizer is not None:
            del tokenizer
            tokenizer = None

        is_model_loaded = False

        # Force garbage collection
        import gc
        gc.collect()

        logger.info("Qwen3VL model unloaded successfully")

    except Exception as e:
        logger.error(f"Failed to unload model: {e}")
        raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Qwen3VL service...")
    yield
    logger.info("Shutting down Qwen3VL service...")
    unload_model()

# Create FastAPI app
app = FastAPI(
    title="Qwen3VL Local Model Service",
    description="OpenAI-compatible API for Qwen3VL vision model",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": is_model_loaded,
        "model_type": "Qwen3VL",
        "service": "vision"
    }

@app.post("/load")
async def load_model_endpoint():
    """Load the model"""
    async with model_lock:
        if is_model_loaded:
            return {"status": "already_loaded", "model": "Qwen3VL"}

        try:
            load_model()
            return {"status": "loaded", "model": "Qwen3VL"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@app.post("/unload")
async def unload_model_endpoint():
    """Unload the model"""
    async with model_lock:
        if not is_model_loaded:
            return {"status": "not_loaded", "model": "Qwen3VL"}

        try:
            unload_model()
            return {"status": "unloaded", "model": "Qwen3VL"}
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

    return {"status": "shutting_down", "model": "Qwen3VL"}

@app.post("/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI-compatible chat completions endpoint"""
    if not is_model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Please call /load first.")

    async with model_lock:
        try:
            # Process messages and generate response
            # This is a simplified implementation - you would need to implement
            # the actual model inference logic here

            # For now, return a mock response
            response = ChatCompletionResponse(
                id=f"chatcmpl-{int(time.time())}",
                created=int(time.time()),
                model=request.model,
                choices=[{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "This is a mock response from Qwen3VL. Model inference not yet implemented."
                    },
                    "finish_reason": "stop"
                }],
                usage={
                    "prompt_tokens": 10,
                    "completion_tokens": 20,
                    "total_tokens": 30
                }
            )

            return response

        except Exception as e:
            logger.error(f"Error in chat completion: {e}")
            raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "object": "list",
        "data": [{
            "id": "qwen3vl-vision",
            "object": "model",
            "created": int(time.time()),
            "owned_by": "local"
        }]
    }

def main():
    """Main entry point"""
    try:
        # Find available port
        port = find_available_port(8003)
        logger.info(f"Starting Qwen3VL service on port {port}")

        # Print port information for Tauri to parse
        print(f"[PORT] {port}")
        print(f"Qwen3VL Vision Model Service starting on http://localhost:{port}")
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