FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
    --index-url https://pypi.tuna.tsinghua.edu.cn/simple \
    --extra-index-url https://pypi.org/simple \
    --timeout 300 \
    -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose port
EXPOSE 8002

# Run the app
CMD ["python", "run.py"]