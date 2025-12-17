# DrawSomething AI 平台的本地 LLM 服务

此目录包含基于 llama-cpp-python 的本地大型语言模型 (LLM) 服务。这允许 Tauri 应用程序在离线状态下运行，而无需互联网连接即可使用 AI 功能。

## 概述

该服务使用 [llama-cpp-python](https://github.com/abetlen/llama-cpp-python) 在本地运行 GGUF 模型。它通过 FastAPI 提供文本生成的 REST API，可以集成到 DrawSomething 应用程序中。

## 先决条件

- Python 3.8 或更高版本
- GGUF 模型文件（例如，从 Hugging Face 或其他来源）

## 设置

1. **创建并激活虚拟环境**（如果尚未完成）：
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Linux/Mac
   ```

2. **安装依赖项**：
   运行安装脚本：
   ```bash
   python install.py
   ```
   或手动安装：
   ```bash
   pip install -r requirements.txt
   ```
   这将在虚拟环境中安装 llama-cpp-python、fastapi、uvicorn、huggingface_hub 和 Pillow。

3. **下载模型**：
   - 推荐模型：Qwen/Qwen3-VL-2B-Instruct-GGUF
   - **自动下载**：运行 `python download_model.py`（下载整个仓库，包括 GGUF 和 MMPROJ 文件）
   - **手动下载指令**：
     1. 激活虚拟环境并安装 Hugging Face CLI（如果尚未安装）：
        ```bash
        .venv\Scripts\activate
        pip install huggingface_hub[cli]
        ```
     2. 下载整个仓库：
        ```bash
        huggingface-cli download Qwen/Qwen3-VL-2B-Instruct-GGUF --local-dir .
        ```
        如果 `huggingface-cli` 不可用，使用 Python 模块：
        ```bash
        python -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen3-VL-2B-Instruct-GGUF', local_dir='.', ignore_patterns=['*.md', '*.txt'])"
        ```
     3. 重命名文件：
        ```bash
        mv qwen3-vl-2b-instruct-q4_k_m.gguf model.gguf
        mv qwen3-vl-2b-instruct-mmproj-f16.gguf mmproj.gguf  # 如果存在
        ```
   - 或直接从 [Hugging Face 网页](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF) 下载所需文件
   - 注意：需要 GGUF 模型文件和 MMPROJ 文件以支持视觉输入。

## 模型配置

### Qwen3-VL-2B-Instruct-GGUF 配置

- **模型大小**：2B 参数，适合大多数硬件
- **量化**：推荐使用 Q4_K_M 量化以平衡性能和内存使用
- **上下文长度**：默认 2048，可根据需要调整
- **线程数**：根据 CPU 核心数设置（默认 4）

### 模型参数调整

在 `run_server.py` 中，您可以调整以下参数：

```python
model = Llama(
    model_path="model.gguf",
    n_ctx=2048,        # 上下文长度
    n_threads=4,       # CPU 线程数
    n_gpu_layers=0,    # GPU 层数（如果支持 CUDA）
    chat_format="qwen" # Qwen 模型的聊天格式
)
```

### 视觉输入支持

Qwen3-VL 支持图像输入，现已配置在服务中：

1. 确保下载了 MMPROJ 文件（mmproj.gguf）
2. 在 API 请求中包含 base64 编码的图像
3. 服务将自动处理图像+文本输入

如果 MMPROJ 文件不存在，视觉功能将被禁用，仅支持文本生成。

## 使用

1. **启动服务器**：
   ```bash
   .venv\Scripts\activate
   python run_server.py
   ```
   服务器将在 `http://127.0.0.1:8000` 上启动

2. **测试服务**：
   运行速度测试：
   ```bash
   python test_speed.py
   ```
   这将发送测试提示并测量响应时间。

3. **API 使用**：
   - **健康检查**：GET `http://127.0.0.1:8000/health`
   - **生成文本**：POST `http://127.0.0.1:8000/generate`
     ```json
     {
       "prompt": "描述这张图片",
       "max_tokens": 100,
       "temperature": 0.7,
       "image": "base64_encoded_image_string"  // 可选，用于视觉输入
     }
     ```
     图像应为 base64 编码的字符串。

## 与 Tauri 集成

要将此服务与 Tauri 应用程序集成：

1. 在启动 Tauri 应用之前，确保服务器正在运行。
2. 在前端代码中，向 `http://127.0.0.1:8000/generate` 发送 HTTP 请求以使用 AI 功能。
3. 对于生产构建，考虑将模型和服务器打包为 Tauri 捆绑包的一部分。

## 配置

- **模型路径**：通过全局变量 `MODEL_PATH` 和 `MMPROJ_PATH` 配置，默认为下载的 Qwen3-VL-2B-Instruct-GGUF 模型路径。如需修改，请编辑 `run_server.py` 开头的全局变量。
- **服务器端口**：默认值为 8000。如需修改，请在 `run_server.py` 中更改 `uvicorn.run` 的参数。
- **模型参数**：根据您的硬件调整 `run_server.py` 中 `Llama` 的参数。

## 性能说明

- 小型模型（7B 参数）在大多数现代硬件上运行良好。
- 如果可用，使用 GPU 加速（llama-cpp-python 支持 CUDA/ROCm）。
- 根据不同用例调整请求中的 `max_tokens` 和 `temperature`。

## 故障排除

- **模型未找到**：确保 `model.gguf` 存在于此目录中。
- **导入错误**：确保您正在使用虚拟环境。
- **性能缓慢**：尝试使用更小的模型或减少 `n_ctx`。
- **内存问题**：使用量化模型（Q4_K_M）以降低内存使用。

## 脚本

- `install.py`：设置虚拟环境并安装依赖项（包括 huggingface_hub 和 Pillow）。
- `download_model.py`：自动下载 Qwen3-VL-2B-Instruct-GGUF 仓库（包括 GGUF 和 MMPROJ 文件）。
- `run_server.py`：启动 LLM API 服务器，支持文本和视觉输入。
- `test_speed.py`：使用示例提示测试推理速度。如果存在 `test.png` 文件，将测试视觉推理。
- `requirements.txt`：Python 依赖包列表。
- `.gitignore`：Git 忽略文件，防止模型文件被提交到版本控制。
