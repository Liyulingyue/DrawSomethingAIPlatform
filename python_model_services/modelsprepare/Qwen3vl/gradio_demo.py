#!/usr/bin/env python3
"""
Gradio demo for Qwen3-VL model.
"""

import gradio as gr
from pathlib import Path
from PIL import Image
import requests
from transformers import AutoProcessor
from optimum.intel.openvino import OVModelForVisualCausalLM
from utils import ensure_utils

# Ensure utility files are downloaded
ensure_utils()

def load_demo_model(model_path, device="AUTO"):
    """Load model for demo."""
    model = OVModelForVisualCausalLM.from_pretrained(model_path, device=device)

    min_pixels = 256 * 28 * 28
    max_pixels = 1280 * 28 * 28
    processor = AutoProcessor.from_pretrained(model_path, min_pixels=min_pixels, max_pixels=max_pixels)

    return model, processor

def predict(message, history, model, processor):
    """Process user input and generate response."""
    if not message:
        return "Please provide a message."

    # Extract image and text from message
    image = None
    text = ""

    if isinstance(message, dict) and "files" in message:
        # Handle file uploads
        for file in message["files"]:
            if file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                image = Image.open(file)
                break

    if isinstance(message, dict) and "text" in message:
        text = message["text"]
    elif isinstance(message, str):
        text = message

    if not text and not image:
        return "Please provide text or upload an image."

    # Prepare messages
    content = []
    if image:
        # For demo, we'll use a placeholder URL or handle image differently
        content.append({"type": "image", "url": "uploaded_image"})
    content.append({"type": "text", "text": text})

    messages = [{"role": "user", "content": content}]

    try:
        inputs = processor.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_dict=True,
            return_tensors="pt"
        )

        # Generate response
        generated_ids = model.generate(**inputs, max_new_tokens=100)
        response = processor.tokenizer.decode(generated_ids[0], skip_special_tokens=True)

        return response
    except Exception as e:
        return f"Error: {str(e)}"

def create_demo(model_path, device="AUTO"):
    """Create Gradio demo interface."""
    model, processor = load_demo_model(model_path, device)

    with gr.Blocks(title="Qwen3-VL Chat") as demo:
        gr.Markdown("# Qwen3-VL Visual Chat")
        gr.Markdown("Upload an image and ask questions about it!")

        chatbot = gr.Chatbot()
        msg = gr.Textbox(placeholder="Ask a question about the image...")
        clear = gr.ClearButton([msg, chatbot])

        def respond(message, chat_history):
            bot_message = predict(message, chat_history, model, processor)
            chat_history.append((message, bot_message))
            return "", chat_history

        msg.submit(respond, [msg, chatbot], [msg, chatbot])

    return demo

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Launch Qwen3-VL Gradio demo")
    parser.add_argument("--model_path", required=True, help="Path to converted model")
    parser.add_argument("--device", default="AUTO", help="Inference device")

    args = parser.parse_args()

    demo = create_demo(args.model_path, args.device)

    try:
        demo.launch(debug=True)
    except Exception:
        demo.launch(debug=True, share=True)