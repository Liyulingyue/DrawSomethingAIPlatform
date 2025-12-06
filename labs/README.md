# SmolVLM-256M-Instruct GGUF 服务

轻量级视觉-语言模型服务，提供 OpenAI 兼容的 API。

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 下载模型

模型会自动从 Hugging Face 下载到缓存目录。或者手动设置环境变量指定模型路径：

```bash
# Windows
set SMOLVLM_MODEL_PATH=C:\path\to\SmolVLM-256M-Instruct-f16.gguf

# Linux/Mac
export SMOLVLM_MODEL_PATH=/path/to/SmolVLM-256M-Instruct-f16.gguf
```

### 3. 启动服务

```bash
python start_smolvlm.py
```

服务会在 `http://127.0.0.1:8888` 启动，提供 OpenAI 兼容的 API

### 4. 测试 API

#### 列出模型

```bash
curl http://127.0.0.1:8888/v1/models
```

#### 调用聊天补全 (OpenAI 兼容)

```bash
curl http://127.0.0.1:8888/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "smolvlm-256m",
    "messages": [
      {"role": "user", "content": "这是一张什么图片?"}
    ],
    "temperature": 0.7,
    "max_tokens": 512
  }'
```

#### 查看 API 文档

打开浏览器访问: http://127.0.0.1:8888/docs

## API 端点

所有 API 都遵循 OpenAI 格式标准：

### POST `/v1/chat/completions`

聊天补全（兼容 OpenAI API）

**请求示例:**
```json
{
  "model": "smolvlm-256m",
  "messages": [
    {"role": "user", "content": "你好"}
  ],
  "temperature": 0.7,
  "max_tokens": 512
}
```

**响应示例:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "smolvlm-256m",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！有什么我可以帮助你的吗?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### GET `/v1/models`

列出可用模型

**响应:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "smolvlm-256m",
      "object": "model",
      "created": 1234567890,
      "owned_by": "llama.cpp"
    }
  ]
}
```

## 前端集成

在前端使用标准的 OpenAI SDK 调用：

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:8888/v1',
  apiKey: 'not-needed',  // llama.cpp 不需要 API Key
  dangerouslyAllowBrowser: true,
})

const completion = await client.chat.completions.create({
  model: 'smolvlm-256m',
  messages: [
    { role: 'user', content: '这张图片里有什么?' }
  ],
  max_tokens: 512,
})

console.log(completion.choices[0].message.content)
```

## 模型信息

- **名称**: SmolVLM-256M-Instruct
- **大小**: ~256MB (GGUF 量化)
- **能力**: 图像理解、描述、简单视觉问答
- **延迟**: CPU 推理约 5-10 秒，GPU 推理约 1-2 秒

## 性能优化

### 使用 GPU 加速

如果你的系统有 NVIDIA GPU，模型会自动使用 GPU：

```bash
# 需要 CUDA 支持的 llama-cpp-python
pip install llama-cpp-python --no-cache-dir --install-option="--cuda"
```

### 调整启动参数

编辑 `start_smolvlm.py`，修改命令行参数：

```python
cmd = [
    ...
    "--n_threads",
    "8",  # 增加线程数加快 CPU 推理
    "--n_batch",
    "1024",  # 增加批处理大小
]
```

## 故障排查

### 模型找不到

确保模型文件存在于以下位置之一：
1. `~/.cache/huggingface/hub/models--mlabonne--SmolVLM-256M-Instruct-gguf/`
2. 环境变量 `SMOLVLM_MODEL_PATH` 指定的路径
3. 当前目录

### 内存不足

模型大小约 256MB，确保系统有足够内存。可以减少 `n_threads` 或使用更小的 `max_tokens`。

### 推理缓慢

- 使用 GPU 加速（如果可用）
- 增加 `n_threads` 参数
- 增加 `n_batch` 参数
- 减少 `max_tokens` 参数

## 许可证

遵循 SmolVLM 的许可证条款。

