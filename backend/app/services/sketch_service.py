"""
简笔画生成和分解服务
整合文本生成图片和笔画分解功能
"""
import base64
import cv2
import numpy as np
from typing import List, Dict, Optional
from openai import OpenAI
import os
from app.config import config


class SketchService:
    """简笔画服务类"""
    
    def generate_image(self, prompt: str, config: Optional[Dict[str, str]] = None) -> bytes:
        """
        根据文本提示生成图片
        
        Args:
            prompt: 文本提示
            config: 可选的配置字典，包含 'url', 'key', 'model'
            
        Returns:
            图片二进制数据
        """
        if not config:
            raise ValueError(
                "Image generation config is required. "
                "Please provide config with 'url', 'key', and 'model', "
                "or configure via environment variables."
            )
        
        # 使用传入的配置
        url = config.get('url')
        key = config.get('key')
        model = config.get('model')
        
        # 检查配置是否有效
        if not key or key == 'not-configured' or not url or not model:
            raise ValueError(
                "Invalid image generation config. "
                "Please ensure 'url', 'key', and 'model' are all configured."
            )
        
        # 创建客户端
        client = OpenAI(api_key=key, base_url=url)
        
        images_base64 = client.images.generate(
            prompt=prompt, 
            model=model, 
            response_format="b64_json"
        )
        
        # 获取第一张图片
        image_data = base64.b64decode(images_base64.data[0].b64_json)
        return image_data
    
    def convert_to_sketch(self, image_array: np.ndarray) -> np.ndarray:
        """
        将彩色图片转换为简笔画
        
        Args:
            image_array: 输入图片数组 (BGR格式)
            
        Returns:
            简笔画图片数组 (灰度图)
        """
        # 转换为灰度图
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        
        # 高斯模糊,减少噪声
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Canny边缘检测
        edges = cv2.Canny(blurred, 30, 100)
        
        # 形态学闭运算,连接断开的边缘
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        
        # 反转颜色(使其变为白底黑线)
        sketch = cv2.bitwise_not(edges)
        
        return sketch
    
    def extract_contours(self, sketch: np.ndarray, sort_method: str = "position") -> List[np.ndarray]:
        """
        提取简笔画的轮廓
        
        Args:
            sketch: 简笔画图片
            sort_method: 排序方法 ('area' 或 'position')
            
        Returns:
            轮廓列表
        """
        # 反转图像用于查找轮廓
        binary = cv2.bitwise_not(sketch)
        
        # 查找所有外部轮廓
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        # 过滤太小的轮廓
        min_area = 50
        contours = [c for c in contours if cv2.contourArea(c) > min_area]
        
        if sort_method == "area":
            # 按面积排序
            contours = sorted(contours, key=cv2.contourArea, reverse=True)
        else:
            # 按位置排序(从左上到右下)
            def get_position_score(contour):
                M = cv2.moments(contour)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                else:
                    x, y, w, h = cv2.boundingRect(contour)
                    cx, cy = x + w // 2, y + h // 2
                return cy * 0.6 + cx * 0.4  # 优先从上到下,其次从左到右
            
            contours = sorted(contours, key=get_position_score)
        
        return contours
    
    def merge_contours(self, contours: List[np.ndarray], max_steps: int) -> List[List[np.ndarray]]:
        """
        合并轮廓以限制最大步数
        
        Args:
            contours: 原始轮廓列表
            max_steps: 最大步数
            
        Returns:
            合并后的轮廓列表,每个元素是一个或多个轮廓的列表
        """
        num_contours = len(contours)
        
        if num_contours <= max_steps:
            # 不需要合并,每个轮廓单独一步
            return [[c] for c in contours]
        
        # 计算合并策略
        contours_per_step = num_contours / max_steps
        merged = []
        current_group = []
        current_count = 0
        
        for i, contour in enumerate(contours):
            current_group.append(contour)
            current_count += 1
            
            # 判断是否应该开始新的一组
            expected_groups = int((i + 1) / contours_per_step)
            if expected_groups > len(merged) or i == num_contours - 1:
                merged.append(current_group)
                current_group = []
                current_count = 0
        
        return merged
    
    def create_progressive_images(
        self, 
        sketch: np.ndarray, 
        contour_groups: List[List[np.ndarray]]
    ) -> List[str]:
        """
        创建渐进式笔画图片
        
        Args:
            sketch: 原始简笔画
            contour_groups: 分组的轮廓列表
            
        Returns:
            base64编码的图片列表
        """
        height, width = sketch.shape
        canvas = np.ones((height, width), dtype=np.uint8) * 255
        
        progressive_images = []
        
        for group in contour_groups:
            # 在画布上绘制当前组的所有笔画
            for contour in group:
                cv2.drawContours(canvas, [contour], -1, (0, 0, 0), thickness=2)
            
            # 将当前状态编码为base64
            _, buffer = cv2.imencode('.png', canvas.copy())
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            progressive_images.append(f"data:image/png;base64,{image_base64}")
        
        return progressive_images
    
    def generate_and_decompose(
        self, 
        prompt: str, 
        max_steps: int = 20,
        sort_method: str = "position",
        config: Optional[Dict[str, str]] = None
    ) -> Dict:
        """
        生成图片并分解为简笔画步骤
        
        Args:
            prompt: 文本提示
            max_steps: 最大步数
            sort_method: 排序方法
            config: 可选的配置字典，包含 'url', 'key', 'model'
            
        Returns:
            包含完整简笔画和步骤列表的字典
        """
        # 1. 生成图片
        image_data = self.generate_image(prompt, config)
        
        # 2. 读取图片
        image_array = cv2.imdecode(
            np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR
        )
        
        # 3. 转换为简笔画
        sketch = self.convert_to_sketch(image_array)
        
        # 4. 提取轮廓
        contours = self.extract_contours(sketch, sort_method)
        
        # 5. 合并轮廓以限制步数
        contour_groups = self.merge_contours(contours, max_steps)
        
        # 6. 创建渐进式图片
        progressive_images = self.create_progressive_images(sketch, contour_groups)
        
        # 7. 获取完整简笔画的base64
        _, buffer = cv2.imencode('.png', sketch)
        final_sketch_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "final_sketch": f"data:image/png;base64,{final_sketch_base64}",
            "steps": progressive_images,
            "total_steps": len(progressive_images),
            "original_contours": len(contours)
        }
    
    def decompose_existing_image(
        self,
        image_base64: str,
        max_steps: int = 20,
        sort_method: str = "position"
    ) -> Dict:
        """
        分解已有的图片为简笔画步骤
        
        Args:
            image_base64: base64编码的图片
            max_steps: 最大步数
            sort_method: 排序方法
            
        Returns:
            包含完整简笔画和步骤列表的字典
        """
        # 1. 解码base64图片
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',')[1]
        
        image_data = base64.b64decode(image_base64)
        
        # 2. 读取图片
        image_array = cv2.imdecode(
            np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR
        )
        
        # 3. 转换为简笔画
        sketch = self.convert_to_sketch(image_array)
        
        # 4. 提取轮廓
        contours = self.extract_contours(sketch, sort_method)
        
        # 5. 合并轮廓以限制步数
        contour_groups = self.merge_contours(contours, max_steps)
        
        # 6. 创建渐进式图片
        progressive_images = self.create_progressive_images(sketch, contour_groups)
        
        # 7. 获取完整简笔画的base64
        _, buffer = cv2.imencode('.png', sketch)
        final_sketch_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "final_sketch": f"data:image/png;base64,{final_sketch_base64}",
            "steps": progressive_images,
            "total_steps": len(progressive_images),
            "original_contours": len(contours)
        }


# 全局实例
sketch_service = SketchService()
