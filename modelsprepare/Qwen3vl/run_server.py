#!/usr/bin/env python3
"""
OpenAI-compatible API server for Qwen3-VL model using OpenVINO.
"""

import argparse
import base64
import io
from pathlib import Path
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image

from openvino_model import load_model, run_inference

app = FastAPI(title="Qwen3-VL OpenVINO API", version="1.0.0")

# Global model variables
model = None
processor = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    max_tokens: Optional[int] = 100
    temperature: Optional[float] = 1.0

class ChatCompletionResponse(BaseModel):
    id: str
    object: str
    created: int
    model: str
    choices: List[dict]
    usage: dict

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI-compatible chat completions endpoint."""
    global model, processor

    if model is None or processor is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # Extract the last user message
        user_messages = [msg for msg in request.messages if msg.role == "user"]
        if not user_messages:
            raise HTTPException(status_code=400, detail="No user message found")

        last_message = user_messages[-1]

        # For now, assume text only. TODO: Add image support
        question = last_message.content

        # Use a default test image if available
        image_path = "test.png"
        if not Path(image_path).exists():
            # If no test image, use a placeholder or error
            raise HTTPException(status_code=400, detail="No image provided and test.png not found")

        # Run inference
        response_text = run_inference(model, processor, image_path, question, request.max_tokens)

        # Format response like OpenAI
        response = {
            "id": "chatcmpl-qwen3vl",
            "object": "chat.completion",
            "created": 1677652288,  # TODO: Use actual timestamp
            "model": request.model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(question.split()),  # Rough estimate
                "completion_tokens": len(response_text.split()),  # Rough estimate
                "total_tokens": len(question.split()) + len(response_text.split())
            }
        }

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/models")
async def list_models():
    """List available models."""
    return {
        "object": "list",
        "data": [{
            "id": "qwen3-vl-openvino",
            "object": "model",
            "created": 1677652288,
            "owned_by": "openvino"
        }]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

def main():
    parser = argparse.ArgumentParser(description="Run OpenAI-compatible API server for Qwen3-VL")
    parser.add_argument("--model_path", required=True, help="Path to converted model")
    parser.add_argument("--device", default="AUTO", help="Inference device")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")

    args = parser.parse_args()

    # Load model globally
    global model, processor
    print(f"Loading model from {args.model_path} on device {args.device}")
    model, processor = load_model(args.model_path, args.device)
    print("Model loaded successfully")

    print(f"Starting server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()