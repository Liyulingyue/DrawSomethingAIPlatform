# Qwen3VL API Tests

This directory contains test scripts for the Qwen3VL API service.

## Test Scripts

### test_api.py
Basic API functionality test including:
- Health check
- Chat completion request

Usage:
```bash
python tests/test_api.py --base_url http://localhost:8000
```

### test_speed.py
Performance test for API response times.

Usage:
```bash
python tests/test_speed.py --base_url http://localhost:8000/v1 --num_runs 10
```

### test_structured_output.py
Test for structured JSON output generation.

Usage:
```bash
python tests/test_structured_output.py --base_url http://localhost:8000/v1 --clue "动物"
```

## Prerequisites

- Qwen3VL service must be running
- Python 3.8+
- requests library

## Running Tests

1. Start the Qwen3VL service
2. Run individual test scripts or all tests

Example:
```bash
# Test basic functionality
python tests/test_api.py

# Test performance
python tests/test_speed.py --num_runs 5

# Test structured output
python tests/test_structured_output.py --clue "水果"
```