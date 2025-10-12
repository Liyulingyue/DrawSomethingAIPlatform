FROM python:3.12-slim

WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose port
EXPOSE 8002

# Set environment variable
ENV AI_STUDIO_API_KEY=""

# Run the app
CMD ["python", "run.py"]