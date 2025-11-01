FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install

# !!!! WARNING !!!!
# The pip config below uses Tsinghua University mirror (pypi.tuna.tsinghua.edu.cn).
# This mirror is optimized for users in mainland China. If you are outside mainland China,
# DO NOT use this mirror. Comment out or remove the pip config lines below to use the default PyPI.

COPY backend/requirements.txt .
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/ && \
    pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn && \
#    pip config set global.extra-index-url https://pypi.org/simple && \
    pip config set global.timeout 600 && \
    pip config set global.retries 10 && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose port
EXPOSE 8002

# Run the app
CMD ["python", "run.py"]