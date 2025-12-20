# CPP Model Services

本目录包含用于 DrawSomething AI 平台的 C++ 模型服务，支持视觉语言模型和文生图模型。

## 模型下载

运行以下命令下载所需的模型：

```bash
python prepare_model.py
```

这将下载：
- **Qwen3-VL-2B-Instruct-GGUF**: 视觉语言模型，用于图像理解和描述 (~2GB)
  - 下载到: `models/Qwen3VL-2B-Instruct/`
- **Z-Image-GGUF**: 文生图模型，目前从 gguf-org/z-image-gguf 下载，但推荐使用 leejet/Z-Image-Turbo-GGUF (~4GB)
  - 下载到: `models/Z-Image/`

**推荐的 Z-Image 模型下载**:
- **完整模型包** (推荐): https://huggingface.co/Comfy-Org/z_image_turbo
  - 包含 diffusion_models/z_image_turbo_bf16.safetensors
  - 包含 text_encoders/qwen_3_4b.safetensors
  - ⚠️ VAE 需要替换为开源版本 (见下文)
- **开源 VAE**: https://huggingface.co/stabilityai/sd-vae-ft-mse-original
  - 使用 ae.safetensors (Apache 2.0 许可证) ⭐ **新发现：完全开源！**
- **GGUF 量化版本**: https://huggingface.co/leejet/Z-Image-Turbo-GGUF
- **Qwen3 文本编码器**: https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF

**新的目录结构**:
```
models/
├── Qwen3VL-2B-Instruct/
│   ├── Qwen3VL-2B-Instruct-Q8_0.gguf
│   └── mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf
└── Z-Image/
    ├── ae.safetensors (开源 VAE, Apache 2.0)
    ├── Qwen3-4B-Instruct-2507-Q4_0.gguf
    └── z_image_turbo-Q4_0.gguf
```

## 模型启动

### 1. 视觉语言模型 (Qwen3-VL)

用于图像理解和猜词游戏：

```bash
llama-server.exe --model models/Qwen3VL-2B-Instruct/Qwen3VL-2B-Instruct-Q8_0.gguf --mmproj models/Qwen3VL-2B-Instruct/mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf --host 127.0.0.1 --port 8080 --ctx-size 4096 --threads 4
```

**参数说明**:
- `--model`: 主模型文件路径
- `--mmproj`: 视觉投影文件路径（必需，用于图像处理）
- `--host`: 服务器监听地址
- `--port`: 服务器端口
- `--ctx-size`: 上下文长度（推荐 4096）
- `--threads`: CPU 线程数

**API 调用示例**:
```bash
curl -X POST http://127.0.0.1:8080/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "描述这张图片",
    "image_data": [{"data": "base64_encoded_image", "id": 1}],
    "stream": true
  }'
```

### 2. 文生图模型 (Z-Image)

**重要说明**: Z-Image 模型需要配合 Qwen3 文本编码器使用。目前下载的模型可能有架构兼容性问题。

**推荐的正确配置** (基于 jayn7/Z-Image-Turbo-GGUF):

从模型页面可以看到：**"Architecture lumina2"** (在模型卡片信息中显示)，这与当前下载的 'pig' 架构不同。

**最佳解决方案 - 使用 stable-diffusion.cpp**:

stable-diffusion.cpp 现在原生支持 Z-Image 模型！这是最简单和最高效的解决方案。

安装和使用步骤：
1. 下载最新的 stable-diffusion.cpp release：
   ```bash
   # 从 GitHub releases 下载适合您平台的二进制文件
   # Windows: sd-master-*-bin-win-avx2-x64.zip
   ```

2. 下载模型文件：
   - **推荐**: 使用 Comfy-Org/z_image_turbo 完整包 (包含所有必需组件)
   - 或分别下载:
     - Z-Image-Turbo-GGUF: https://huggingface.co/leejet/Z-Image-Turbo-GGUF
     - Qwen3-4B-Instruct-GGUF: https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF
     - VAE: 从 Comfy-Org/z_image_turbo 获取 (开源友好)

3. 运行命令：
   ```bash
   # 使用当前下载的 GGUF 版本 + 开源 VAE (ae.safetensors)
   .\sd-cli.exe --diffusion-model models/Z-Image/z_image_turbo-Q4_0.gguf --vae models/Z-Image/ae.safetensors --llm models/Z-Image/Qwen3-4B-Instruct-2507-Q4_0.gguf -p "生成一张苹果的图片" --cfg-scale 1.0 -H 1024 -W 1024
   ```

**服务器模式** (推荐用于应用集成):
```bash
# 使用当前下载的 GGUF 版本 + 开源 VAE
.\sd-server.exe --diffusion-model models/Z-Image/z_image_turbo-Q4_0.gguf --vae models/Z-Image/ae.safetensors --llm models/Z-Image/Qwen3-4B-Instruct-2507-Q4_0.gguf --listen-ip 127.0.0.1 --listen-port 8081
```

**sd-server 参数说明**:
- `--diffusion-model`: 扩散模型文件路径
- `--vae`: VAE 模型文件路径（用于图像解码）
- `--llm`: 文本编码器模型文件路径（Qwen3）
- `--listen-ip`: 服务器监听 IP 地址（默认 127.0.0.1）
- `--listen-port`: 服务器监听端口（默认 1234）

**API 参数说明**:
- `prompt`: 生成图片的提示词
- `n`: 生成图片的数量（默认 1）
- `size`: 图片尺寸，格式为 "宽度x高度"（默认 "512x512"）
- `output_format`: 输出格式，"png" 或 "jpeg"（默认 "png"）
- `output_compression`: 输出压缩质量，对于 JPEG 是质量 (0-100)，对于 PNG 无效
- `sd_cpp_extra_args`: JSON 字符串，用于传递额外的生成参数，如 `{"steps": 9, "cfg_scale": 1.0}`

**API 调用示例**:
```bash
curl -X POST http://127.0.0.1:8081/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "生成一张苹果的图片",
    "steps": 20,
    "cfg_scale": 1.0,
    "width": 1024,
    "height": 1024
  }'
```


**当前临时解决方案 - 使用 Python 版本的服务**:

```bash
cd ../python_model_services/modelsservices/Z-Image
python z_image_service.py
```

Python 版本使用完整的 Stable Diffusion 模型，不需要额外的文本编码器。

**如果将来有兼容的 llama-server 版本，可以尝试以下命令**:

```bash
# 主模型 + 文本编码器
llama-server.exe --model models/Z-Image/z_image_turbo-Q4_0.gguf --text-model models/Z-Image/Qwen3-4B-Instruct-2507-Q4_0.gguf --host 127.0.0.1 --port 8081 --ctx-size 2048 --threads 4
```

**API 调用示例** (Python 版本):
```bash
curl -X POST http://127.0.0.1:8004/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "生成一张苹果的图片",
    "size": "512x512",
    "n": 1,
    "sd_cpp_extra_args": "{\"steps\": 9, \"cfg_scale\": 1.0}"
  }'
```

**注意**: 当前下载的 gguf-org/z-image-gguf 模型有架构问题。推荐使用 jayn7/Z-Image-Turbo-GGUF，它使用正确的 lumina2 架构并明确需要 Qwen3 文本编码器配合。

## 集成到应用

这些服务通过 HTTP API 与前端应用集成：

- **视觉模型**: 用于"挑战绘画"页面的 AI 猜词功能
- **文生图模型**: 用于"AI 绘画"页面的图像生成功能

## 注意事项

1. **硬件要求**: 确保有足够的 RAM 和 CPU 资源
2. **端口配置**: 确保端口 8080 未被其他服务占用
3. **模型大小**: Qwen3-VL 模型约 2GB，Z-Image-GGUF 模型约 4GB
4. **Z-Image 限制**: 当前的 GGUF 版本不被 llama-server 支持，建议使用 stable-diffusion.cpp
5. **完全开源**: 使用 ae.safetensors (Apache 2.0 许可证) 作为 VAE，完全开源友好 ⭐
6. **Python 版本**: 需要额外下载 Stable Diffusion 模型（约 2-5GB，取决于模型版本）

## 故障排除

- **模型加载失败**: 检查模型文件是否完整下载
- **端口冲突**: 修改 `--port` (llama-server) 或 `--listen-port` (sd-server) 参数使用其他端口
- **内存不足**: 减少 `--ctx-size` 或增加系统内存
- **性能问题**: 调整 `--threads` 参数或使用 GPU 版本
- **Z-Image 相关问题**: 
  - 确保同时指定 `--diffusion-model`、`--vae` 和 `--llm` 参数
  - 使用 stable-diffusion.cpp 而不是 llama-server
  - 使用开源 VAE (ae.safetensors, Apache 2.0) 或 stabilityai/sd-vae-ft-mse-original (MIT)
  - 检查 Qwen3 文本编码器文件是否正确
- **ComfyUI-GGUF 安装问题**: 确保 ComfyUI 版本足够新，并正确安装 gguf 依赖
- **Python 服务模型缺失**: 需要下载 Stable Diffusion 模型到对应目录

## 相关文件

- `prepare_model.py`: 模型下载脚本
- `test_sd_api.py`: SD API 测试脚本（Python 调用示例）
- `GGUF_GUIDE.md`: 详细的 GGUF 使用指南
- `requirements.txt`: Python 依赖
- [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp): **推荐的 Z-Image 运行环境**
- [Z-Image 使用指南](https://github.com/leejet/stable-diffusion.cpp/blob/master/docs/z_image.md): 详细的 Z-Image 配置说明
- [Comfy-Org/z_image_turbo](https://huggingface.co/Comfy-Org/z_image_turbo): Z-Image 模型包
- [stabilityai/sd-vae-ft-mse-original](https://huggingface.co/stabilityai/sd-vae-ft-mse-original): **开源 VAE** (MIT 许可证)
- [jayn7/Z-Image-Turbo-GGUF](https://huggingface.co/jayn7/Z-Image-Turbo-GGUF): 备选的 Z-Image 模型源
- **ae.safetensors**: 当前使用的开源 VAE (Apache 2.0 许可证) ⭐ **完全开源！**</content>
<parameter name="filePath">f:\PythonCodes\DrawSomethingAIPlatform\cpp_model_services\README.md