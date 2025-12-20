import os
import shutil
from modelscope import snapshot_download

def prepare_qwen3vl_model():
    """
    下载 Qwen3-VL-2B-Instruct-GGUF 模型的 Q8 量化版本文件：
    - Qwen3VL-2B-Instruct-Q8_0.gguf
    - mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf
    """
    model_id = 'Qwen/Qwen3-VL-2B-Instruct-GGUF'
    cache_dir = './models_cache'
    target_dir = './models'

    # 需要下载的文件列表
    required_files = [
        'Qwen3VL-2B-Instruct-Q8_0.gguf',
        'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'
    ]

    # 检查是否所有文件都已存在
    os.makedirs(target_dir, exist_ok=True)
    all_exist = True
    for filename in required_files:
        target_path = os.path.join(target_dir, filename)
        if not os.path.exists(target_path):
            all_exist = False
            break

    if all_exist:
        print("Qwen3-VL 模型文件已存在，跳过下载")
        return [os.path.join(target_dir, f) for f in required_files]

    # 下载模型到缓存目录
    print("正在下载 Qwen3-VL 模型...")
    model_dir = snapshot_download(model_id, cache_dir=cache_dir)
    print(f"Qwen3-VL 模型下载完成，路径: {model_dir}")

    # 确保目标目录存在
    os.makedirs(target_dir, exist_ok=True)

    downloaded_files = []
    for filename in required_files:
        source_path = os.path.join(model_dir, filename)
        if os.path.exists(source_path):
            target_path = os.path.join(target_dir, filename)
            shutil.copy2(source_path, target_path)
            downloaded_files.append(target_path)
            print(f"文件已复制: {filename} -> {target_path}")
        else:
            print(f"警告: 文件 {filename} 未找到")

    if len(downloaded_files) == len(required_files):
        print("Qwen3-VL 所有必需文件下载完成")
        return downloaded_files
    else:
        raise FileNotFoundError(f"Qwen3-VL 部分文件缺失，已下载: {downloaded_files}")

def download_z_image_gguf_model():
    """
    下载 gguf-org/z-image-gguf 模型的指定文件：
    - qwen3_4b_f32-q4_0.gguf
    - z-image-turbo-q4_0.gguf
    """
    model_id = 'gguf-org/z-image-gguf'
    cache_dir = './models_cache'
    target_dir = './models'

    # 需要下载的文件列表
    required_files = [
        'qwen3_4b_f32-q4_0.gguf',
        'z-image-turbo-q4_0.gguf'
    ]

    # 检查是否所有文件都已存在
    os.makedirs(target_dir, exist_ok=True)
    all_exist = True
    for filename in required_files:
        target_path = os.path.join(target_dir, filename)
        if not os.path.exists(target_path):
            all_exist = False
            break

    if all_exist:
        print("Z-Image-GGUF 模型文件已存在，跳过下载")
        return [os.path.join(target_dir, f) for f in required_files]

    # 下载模型到缓存目录
    print("正在下载 Z-Image-GGUF 模型...")
    model_dir = snapshot_download(model_id, cache_dir=cache_dir)
    print(f"Z-Image-GGUF 模型下载完成，路径: {model_dir}")

    # 确保目标目录存在
    os.makedirs(target_dir, exist_ok=True)

    downloaded_files = []
    for filename in required_files:
        source_path = os.path.join(model_dir, filename)
        if os.path.exists(source_path):
            target_path = os.path.join(target_dir, filename)
            shutil.copy2(source_path, target_path)
            downloaded_files.append(target_path)
            print(f"文件已复制: {filename} -> {target_path}")
        else:
            print(f"警告: 文件 {filename} 未找到")

    if len(downloaded_files) == len(required_files):
        print("Z-Image-GGUF 所有必需文件下载完成")
        return downloaded_files
    else:
        raise FileNotFoundError(f"Z-Image-GGUF 部分文件缺失，已下载: {downloaded_files}")

if __name__ == "__main__":
    try:
        print("开始下载模型...")
        qwen_paths = prepare_qwen3vl_model()
        print(f"Qwen3-VL 模型获取成功: {qwen_paths}")
        
        z_paths = download_z_image_gguf_model()
        print(f"Z-Image-GGUF 模型获取成功: {z_paths}")
        
        print("所有模型下载完成")
    except Exception as e:
        print(f"模型下载失败: {e}")