#!/usr/bin/env python3
"""
Test script for Z-Image model loading and image generation
"""

import os
import sys
import asyncio
import logging
import base64
from io import BytesIO
from PIL import Image

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from z_image_service import load_model, generate_images, ImageGenerationRequest

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_z_image():
    """Test Z-Image model loading and image generation"""
    try:
        logger.info("Starting Z-Image test...")

        # Step 1: Load the model
        logger.info("Loading model...")
        load_model()
        logger.info("Model loaded successfully")

        # Step 2: Generate images
        logger.info("Generating test images...")

        # Create test request
        test_request = ImageGenerationRequest(
            prompt="A beautiful sunset over mountains, digital art",
            size="512x512",
            n=1
        )

        # Generate images
        response = await generate_images(test_request)

        logger.info(f"Generated {len(response.data)} images")

        # Save images to files
        for i, image_data in enumerate(response.data):
            # Decode base64 image
            image_base64 = image_data['url'].split(',')[1]
            image_bytes = base64.b64decode(image_base64)

            # Create PIL image
            image = Image.open(BytesIO(image_bytes))

            # Save to file
            filename = f"test_generated_image_{i+1}.png"
            image.save(filename)
            logger.info(f"Saved image to {filename}")

            # Print revised prompt if available
            if 'revised_prompt' in image_data:
                logger.info(f"Revised prompt: {image_data['revised_prompt']}")

        logger.info("Test completed successfully")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    # Run the async test
    asyncio.run(test_z_image())