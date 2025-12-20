#!/usr/bin/env python3
"""
DrawSomething AI Platform - SD API 测试脚本
用于测试 stable-diffusion.cpp sd-server 的图像生成 API
"""

import requests
import json
import base64
import os
from datetime import datetime

def test_sd_api():
    """
    测试 SD API 接口
    """
    # API 端点
    url = "http://127.0.0.1:8081/v1/images/generations"

    # 请求头
    headers = {
        "Content-Type": "application/json"
    }

    # 请求数据
    data = {
        "prompt": "生成一张苹果的图片",
        "n": 1,
        "size": "64x64",
        "output_format": "png",
        "output_compression": 100,  # 对于 PNG 无效，对于 JPEG 是质量 (0-100)
        "sd_cpp_extra_args": '{"steps": 9}'  # 设置迭代次数为9
    }

    print("正在调用 SD API...")
    print(f"URL: {url}")
    print(f"请求数据: {json.dumps(data, indent=2, ensure_ascii=False)}")

    try:
        # 发送请求
        response = requests.post(url, headers=headers, json=data, timeout=300)  # 5分钟超时

        print(f"响应状态码: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("API 调用成功！")

            # 检查响应结构
            if "data" in result and len(result["data"]) > 0:
                # 创建输出目录
                output_dir = "generated_images"
                os.makedirs(output_dir, exist_ok=True)

                # 生成文件名
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{output_dir}/apple_{timestamp}.png"

                # 解码 base64 图片数据
                image_data = result["data"][0]["b64_json"]
                image_bytes = base64.b64decode(image_data)

                # 保存图片
                with open(filename, "wb") as f:
                    f.write(image_bytes)

                print(f"图片已保存到: {filename}")
                print(f"图片大小: {len(image_bytes)} bytes")

                # 显示其他信息
                if "created" in result:
                    print(f"创建时间: {result['created']}")
                if "output_format" in result:
                    print(f"输出格式: {result['output_format']}")

            else:
                print("响应中没有找到图片数据")
                print(f"完整响应: {json.dumps(result, indent=2, ensure_ascii=False)}")

        else:
            print(f"API 调用失败: {response.status_code}")
            print(f"错误信息: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"请求异常: {e}")
    except Exception as e:
        print(f"其他异常: {e}")

def test_llama_api():
    """
    测试 llama-server API 接口 (Qwen3-VL)
    """
    url = "http://127.0.0.1:8080/completion"

    headers = {
        "Content-Type": "application/json"
    }

    # 注意：这里需要实际的 base64 编码图片数据
    data = {
        "prompt": "描述这张图片",
        "image_data": [{"data": "base64_encoded_image_placeholder", "id": 1}],
        "stream": True
    }

    print("\n正在测试 llama-server API...")
    print(f"URL: {url}")
    print("注意：需要替换 image_data 中的 base64 图片数据")

    try:
        response = requests.post(url, headers=headers, json=data, timeout=60, stream=True)

        print(f"响应状态码: {response.status_code}")

        if response.status_code == 200:
            print("llama-server API 调用成功！")
            # 对于流式响应，这里只是简单测试
            print("流式响应开始...")
            for line in response.iter_lines():
                if line:
                    print(line.decode('utf-8'))
        else:
            print(f"API 调用失败: {response.status_code}")
            print(f"错误信息: {response.text}")

    except Exception as e:
        print(f"异常: {e}")

if __name__ == "__main__":
    print("=== DrawSomething AI Platform API 测试 ===")

    # 测试 SD API
    test_sd_api()

    # 可选：测试 llama API (需要图片数据)
    # test_llama_api()

    print("\n测试完成！")