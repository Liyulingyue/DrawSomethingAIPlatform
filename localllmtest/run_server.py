#!/usr/bin/env python3
"""
Local LLM Server using llama-cpp-python and FastAPI.
This provides a REST API for text generation.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import os
import base64
from llama_cpp import Llama
from llama_cpp.llama_chat_format import Llava15ChatHandler

app = FastAPI(title="Local LLM Service", description="A simple LLM service for DrawSomething AI Platform")

# Global variables for model paths (easy to modify for testing)
MODEL_PATH = "models/Qwen/Qwen3-VL-2B-Instruct-GGUF/Qwen3VL-2B-Instruct-Q4_K_M.gguf"
MMPROJ_PATH = "models/Qwen/Qwen3-VL-2B-Instruct-GGUF/mmproj-Qwen3VL-2B-Instruct-F16.gguf"

# Global model variable
model = None

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7
    image: str = None  # Base64 encoded image or image URL

class GenerateResponse(BaseModel):
    text: str

def load_model():
    """Load the LLM model. Assumes model.gguf and mmproj.gguf are in the same directory."""
    global model
    model_path = MODEL_PATH
    mmproj_path = MMPROJ_PATH

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file {model_path} not found. Please download the model files.")

    print("Loading model...")
    chat_handler = None
    if os.path.exists(mmproj_path):
        chat_handler = Llava15ChatHandler(clip_model_path=mmproj_path)
        print("Vision support enabled with mmproj.")
    else:
        print("Warning: mmproj.gguf not found. Vision features will not be available.")

    model = Llama(
        model_path=model_path,
        n_ctx=2048,
        n_threads=4,
        chat_format="qwen",
        chat_handler=chat_handler
    )  # Adjust parameters as needed
    print("Model loaded successfully!")

@app.on_event("startup")
async def startup_event():
    load_model()

@app.post("/generate", response_model=GenerateResponse)
async def generate_text(request: GenerateRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        messages = []
        if request.image:
            # Decode base64 image if provided
            import io
            from PIL import Image
            image_data = base64.b64decode(request.image)
            image = Image.open(io.BytesIO(image_data))
            messages.append({"role": "user", "content": [{"type": "image", "image": image}, {"type": "text", "text": request.prompt}]})
        else:
            messages.append({"role": "user", "content": request.prompt})

        response = model.create_chat_completion(
            messages=messages,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        text = response["choices"][0]["message"]["content"]
        return GenerateResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)