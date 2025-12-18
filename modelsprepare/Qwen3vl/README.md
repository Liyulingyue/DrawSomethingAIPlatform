# OpenVINO 本地模型推理 - Qwen3-VL

本项目提供使用 OpenVINO 运行 Qwen3-VL 多模态模型的本地实现，针对本地推理进行了优化，不依赖过时的 llamacpppython 等库。

## 概述

Qwen3-VL 是一个强大的多模态大语言模型，支持视觉-语言任务。本实现使用 OpenVINO 在各种设备上进行高效本地推理。

## 特性

- **模型转换和优化**：将 PyTorch 模型转换为 OpenVINO IR 格式
- **权重压缩**：支持使用 NNCF 的 4-bit 和 FP16 权重压缩
- **设备选择**：可在 CPU、GPU 或其他支持的设备上运行
- **交互式演示**：基于 Gradio 的 Web 界面用于测试

## 先决条件

- Python 3.8+
- OpenVINO 2025.3
- PyTorch 2.8
- requirements.txt 中列出的其他依赖

## 安装

1. 克隆或下载此仓库
2. 安装依赖：

```bash
pip install -r requirements.txt
```

3. 安装 OpenVINO 相关的 Git 包（必需）：

```bash
pip install git+https://github.com/openvino-dev-samples/optimum.git@qwen3vl
pip install git+https://github.com/openvino-dev-samples/transformers.git@qwen3vl
pip install git+https://github.com/openvino-dev-samples/optimum-intel.git@741501ef4bb57f29e22ef0695f77f2ba67a6c16e
```

这些包包含了 `optimum-cli` 命令和其他必要的组件。

## 使用方法

### 1. 下载模型

首先，从 Hugging Face 下载模型到本地目录：

```bash
python convert_model.py --model Qwen/Qwen3-VL-2B-Instruct --download
```

这将下载模型到 `Models/Qwen/Qwen3-VL-2B-Instruct` 目录。

或者手动下载：
- 访问 [Qwen/Qwen3-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct)
- 使用 `git lfs clone` 或 Hugging Face CLI 下载到 `Models/Qwen/Qwen3-VL-2B-Instruct`

### 2. 模型选择和转换

运行模型转换脚本以准备模型：

```python
python convert_model.py --model Qwen/Qwen3-VL-2B-Instruct --local_path Models/Qwen/Qwen3-VL-2B-Instruct
```

这将：
- 使用本地下载的模型
- 将其转换为 OpenVINO 格式
- 如果启用，则应用权重压缩
- 保存到 `Models_Converted/Qwen3-VL-2B-Instruct/INT4` 目录

### 3. 运行推理

使用主要的推理脚本：

```python
python run_inference.py --model_path Models_Converted/Qwen3-VL-2B-Instruct/INT4 --device CPU
```

### 4. 交互式演示

启动 Gradio Web 界面：

```python
python gradio_demo.py --model_path Models_Converted/Qwen3-VL-2B-Instruct/INT4
```

### 5. 速度测试

运行推理速度测试（通过 API）：

```python
python test_speed.py --base_url http://localhost:8000/v1 --num_runs 10
```

这将通过 OpenAI API 测试服务器的响应速度。

### 6. 结构化输出测试

测试模型的结构化输出能力（通过 API 调用，参考 backend 实现）：

```python
python test_structured_output.py --base_url http://localhost:8000/v1 --clue "动物"
```

这将通过 OpenAI API 测试模型是否能按照指定的 JSON 格式返回结构化结果。确保服务器已启动。

**输出包含时间统计**：API 推理时间、响应解析时间和总耗时。

## 模型选项

可用模型：
- Qwen/Qwen3-VL-2B-Instruct
- Qwen/Qwen3-VL-4B-Instruct
- Qwen/Qwen3-VL-8B-Instruct



```python
from openvino_model import load_model, run_inference

model, processor = load_model(model_path, device)
result = run_inference(model, processor, image_path, question)
```

## 故障排除

- 确保 OpenVINO 已正确安装
- 检查设备兼容性
- 对于内存问题，使用权重压缩
- 如有需要，更新 PyTorch 和相关库

## 参考资料

- [Qwen3-VL 模型卡片](https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct)
- [OpenVINO 文档](https://docs.openvino.ai/)
- [Optimum Intel](https://huggingface.co/docs/optimum/intel/index)