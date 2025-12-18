from huggingface_hub import snapshot_download
import os

# 设置下载路径
model_dir = "../Models/Z-Image-Turbo"

# 创建目录（如果不存在）
os.makedirs(model_dir, exist_ok=True)

# 下载模型
snapshot_download(
    repo_id="Tongyi-MAI/Z-Image-Turbo",
    local_dir=model_dir,
    local_dir_use_symlinks=False
)

print(f"模型已下载到: {model_dir}")