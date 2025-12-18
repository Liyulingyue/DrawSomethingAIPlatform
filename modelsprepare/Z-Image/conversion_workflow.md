# Z-Image 模型转换全流程

基于 CSDN 文章《使用 OpenVINO™ 加速部署通义 Z-Image（造相）文生图模型》，以下是完整的模型转换和部署流程组织。

## 流程概述

1. **环境准备**：设置 Python 虚拟环境并安装必要依赖
2. **模型下载**：从 Hugging Face 下载原始模型到 Models 目录
3. **模型转换**：将 PyTorch 模型转换为 OpenVINO IR 格式
4. **模型部署**：使用转换后的模型进行推理生成图像

## 详细步骤

### 步骤 1: 环境准备

创建并激活 Python 虚拟环境，然后安装所需包：

```bash
# 创建虚拟环境
python -m venv py_venv

# 激活虚拟环境 (Windows)
./py_venv/Scripts/activate.bat

# 卸载可能冲突的包
pip uninstall -y optimum transformers optimum-intel diffusers

# 安装依赖包
pip install git+https://github.com/huggingface/diffusers
pip install git+https://github.com/openvino-dev-samples/optimum-intel.git@zimage
pip install nncf
pip install torch==2.8.0 torchvision==0.23.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cpu
pip install openvino==2025.4
pip install huggingface_hub  # 用于下载模型
```

### 步骤 2: 模型下载

从 Hugging Face 下载 Z-Image-Turbo 模型到 Models 目录：

```bash
python download_model.py
```

或者使用命令行方式：

```bash
# 安装 huggingface_hub（如果尚未安装）
pip install huggingface_hub

# 下载模型到 Models 目录
huggingface-cli download Tongyi-MAI/Z-Image-Turbo --local-dir ../Models/Z-Image-Turbo --local-dir-use-symlinks False
```

### 步骤 3: 模型转换

使用 Optimum CLI 工具将原始 PyTorch 模型转换为 OpenVINO IR 格式：

```bash
# 转换为 INT4 量化格式 (推荐用于性能优化)
optimum-cli export openvino --model ../Models/Z-Image-Turbo --task text-to-image ../Models_Converted/Z-Image-Turbo/INT4 --weight-format int4 --group-size 64 --ratio 1.0

# 或者使用 FP16 格式 (如果优先考虑图像质量)
optimum-cli export openvino --model ../Models/Z-Image-Turbo --task text-to-image ../Models_Converted/Z-Image-Turbo/FP16 --weight-format fp16
```

**参数说明：**
- `--model`: Hugging Face 模型 ID 或本地路径
- `--task`: 任务类型 (text-to-image)
- `--weight-format`: 权重格式 (int4 或 fp16)
- `--group-size`: 量化分组大小。在 INT4 量化中，将权重矩阵按每组 64 个元素进行分组量化，这样可以在保持模型精度的同时减少计算量。较小的组大小（如 32 或 64）通常提供更好的精度，但会增加模型大小；较大的组大小（如 128）会减少模型大小但可能略微降低精度
- `--ratio`: 量化比例。通常设置为 1.0，表示对所有权重进行量化

### 步骤 4: 模型部署和推理

创建 Python 脚本进行模型推理：

```bash
python inference.py
```

## 注意事项

1. **硬件要求**: 推荐在 Intel CPU/GPU 上运行以获得最佳性能
2. **模型大小**: Z-Image-Turbo 是 6B 参数模型，确保有足够的存储空间
3. **推理速度**: 使用 INT4 量化可在保持质量的同时显著提升推理速度
4. **步骤数**: Turbo 模型在少于 10 个步骤时就能生成高质量图像

## 参考资源

- [Z-Image-Turbo 模型卡片](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo)
- [OpenVINO™ 官方文档](https://docs.openvino.ai/)
- [Optimum Intel GitHub](https://github.com/huggingface/optimum-intel)
- [Diffusers 库文档](https://huggingface.co/docs/diffusers)

## 故障排除

- 如果遇到依赖冲突，请确保按照步骤 1 的顺序安装包
- 对于网络问题，可以尝试使用本地模型路径替代 Hugging Face ID
- 如果推理速度慢，考虑使用 GPU 设备 (`device="gpu"`) 如果可用