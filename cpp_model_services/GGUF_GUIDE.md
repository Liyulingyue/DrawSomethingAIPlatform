# GGUF 模型服务启动指南

本文档介绍如何使用 llama-server 启动基于 GGUF 格式的 AI 模型服务，包括文生图（Text-to-Image）和图生文（Image-to-Text）功能。

## 模型下载

首先运行 `prepare_model.py` 下载所需模型：

```bash
cd cpp_model_services
python prepare_model.py
```

这将下载：
- Qwen3-VL-2B-Instruct-GGUF (图生文)
- gguf-org/z-image-gguf (文生图)

## 服务启动

### 1. 图生文服务 (Image-to-Text)

使用 Qwen3-VL 模型启动图生文服务：

```bash
llama-server.exe --model models/Qwen3VL-2B-Instruct-Q8_0.gguf --mmproj models/mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf --host 127.0.0.1 --port 8080 --ctx-size 4096 --threads 4
```

#### API 调用示例

```bash
curl -X POST http://127.0.0.1:8080/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "描述这张图片",
    "image_data": [{"data": "base64_encoded_image", "id": 1}],
    "stream": true
  }'
```

### 2. 文生图服务 (Text-to-Image)

使用 Z-Image-GGUF 模型启动文生图服务：

```bash
llama-server.exe --model models/qwen3_4b_f32-q4_0.gguf --host 127.0.0.1 --port 8081 --ctx-size 2048 --threads 4
```

或使用 Turbo 版本：

```bash
llama-server.exe --model models/z-image-turbo-q4_0.gguf --host 127.0.0.1 --port 8081 --ctx-size 2048 --threads 4
```

#### API 调用示例

```bash
curl -X POST http://127.0.0.1:8081/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "生成一张苹果的图片",
    "stream": true
  }'
```

## 参数说明

- `--model`: 模型文件路径
- `--mmproj`: 视觉投影文件路径（仅图生文模型需要）
- `--host`: 服务器绑定地址
- `--port`: 服务器端口
- `--ctx-size`: 上下文长度
- `--threads`: CPU 线程数

## 集成到应用

这些服务可以通过 HTTP API 集成到前端应用中，实现 AI 绘画辅助功能。

## 故障排除

1. **模型文件未找到**：确保 `prepare_model.py` 已成功运行
2. **端口冲突**：检查端口是否被其他服务占用
3. **内存不足**：减少 `--ctx-size` 或增加系统内存
4. **性能问题**：调整 `--threads` 参数或使用 GPU 版本