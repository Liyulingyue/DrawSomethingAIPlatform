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
from app._config.grid_dimensions import GRID_DIMENSIONS_MAP


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
            sort_method: 排序方法 ('area' 或 'position', 'split' 不适用此方法)
            
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
    
    def find_best_grid_dimensions(self, total_blocks: int) -> tuple[int, int]:
        """
        根据总块数找到差异最小的行列数
        
        Args:
            total_blocks: 总块数
            
        Returns:
            (rows, cols) 元组，rows * cols >= total_blocks，且rows和cols的差最小
        """
        # 首先检查映射表
        if total_blocks in GRID_DIMENSIONS_MAP:
            return GRID_DIMENSIONS_MAP[total_blocks]
        
        # 如果映射表中没有，进行计算
        # 找到所有约数对
        factors = []
        for i in range(1, int(total_blocks**0.5) + 1):
            if total_blocks % i == 0:
                factors.append((i, total_blocks // i))
        
        # 找到差异最小的约数对
        min_diff = float('inf')
        best_pair = (1, total_blocks)
        
        for rows, cols in factors:
            diff = abs(rows - cols)
            if diff < min_diff:
                min_diff = diff
                best_pair = (rows, cols)
            elif diff == min_diff:
                # 如果差异相同，选择更接近正方形的
                current_ratio = max(rows, cols) / min(rows, cols)
                best_ratio = max(best_pair[0], best_pair[1]) / min(best_pair[0], best_pair[1])
                if current_ratio < best_ratio:
                    best_pair = (rows, cols)
        
        return best_pair
    
    def create_split_grid(self, image: np.ndarray, rows: int = 5, cols: int = 4) -> List[np.ndarray]:
        # 处理不同通道数的图片
        if len(image.shape) == 3:
            height, width, _ = image.shape
        else:
            height, width = image.shape
        
        block_height = height // rows
        block_width = width // cols
        
        blocks = []
        
        # 创建所有网格块
        for i in range(rows):
            for j in range(cols):
                y_start = i * block_height
                y_end = (i + 1) * block_height if i < rows - 1 else height
                x_start = j * block_width
                x_end = (j + 1) * block_width if j < cols - 1 else width
                
                # 提取当前块
                block = image[y_start:y_end, x_start:x_end].copy()
                blocks.append(block)
        
        return blocks
    
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
    
    def create_progressive_split_images(self, image: np.ndarray, blocks: List[np.ndarray], rows: int = 5, cols: int = 4) -> List[str]:
        """
        创建基于网格分割的渐进式图片
        
        Args:
            image: 原始图片（可以是彩色或灰度）
            blocks: 随机顺序的图片块列表
            
        Returns:
            base64编码的图片列表
        """
        # 处理不同通道数的图片
        if len(image.shape) == 3:
            height, width, _ = image.shape
        else:
            height, width = image.shape
        
        # 创建与原图相同通道数的画布
        if len(image.shape) == 3:
            canvas = np.ones((height, width, image.shape[2]), dtype=image.dtype) * 255
        else:
            canvas = np.ones((height, width), dtype=image.dtype) * 255
        
        progressive_images = []
        block_height = height // rows
        block_width = width // cols
        # 生成图片id的随机序列
        random_indices = np.random.permutation(len(blocks))
        
        for step_index in range(len(blocks)):
            # 获取当前步骤要显示的块索引
            block_index = random_indices[step_index]
            block = blocks[block_index]
            row = block_index // cols
            col = block_index % cols
            
            y_start = row * block_height
            y_end = (row + 1) * block_height if row < rows - 1 else height
            x_start = col * block_width
            x_end = (col + 1) * block_width if col < cols - 1 else width
            
            # 将块复制到画布的对应位置
            canvas[y_start:y_end, x_start:x_end] = block
            
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
            sort_method: 排序方法 ('area', 'position', 或 'split')
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
        
        # 3. 分解图片
        return self._decompose_image_array(image_array, max_steps, sort_method)
    
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
            sort_method: 排序方法 ('area', 'position', 或 'split')
            
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
        
        # 3. 分解图片
        return self._decompose_image_array(image_array, max_steps, sort_method)

    def _decompose_image_array(
        self,
        image_array: np.ndarray,
        max_steps: int = 20,
        sort_method: str = "position"
    ) -> Dict:
        """
        分解图片数组为简笔画步骤（内部方法）
        
        Args:
            image_array: 图片数组
            max_steps: 最大步数
            sort_method: 排序方法
            
        Returns:
            包含分解结果的字典
        """
        # 根据排序方法处理
        if sort_method == "split":
            # 根据max_steps计算最佳的行列数
            rows, cols = self.find_best_grid_dimensions(max_steps)
            # 分割成网格
            blocks = self.create_split_grid(image_array, rows, cols)
            # 创建渐进式图片
            progressive_images = self.create_progressive_split_images(image_array, blocks, rows, cols)
            original_contours = len(blocks)  # 网格块数

            _, buffer = cv2.imencode('.png', image_array)
            final_sketch_base64 = base64.b64encode(buffer).decode('utf-8')
        else:
            # 转换为简笔画
            sketch = self.convert_to_sketch(image_array)

            # 提取轮廓
            contours = self.extract_contours(sketch, sort_method)
            
            # 合并轮廓以限制步数
            contour_groups = self.merge_contours(contours, max_steps)
            
            # 创建渐进式图片
            progressive_images = self.create_progressive_images(sketch, contour_groups)
            original_contours = len(contours)

            # 获取完整简笔画的base64
            _, buffer = cv2.imencode('.png', sketch)
            final_sketch_base64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "final_sketch": f"data:image/png;base64,{final_sketch_base64}",
            "steps": progressive_images,
            "total_steps": len(progressive_images),
            "original_contours": original_contours
        }

# 全局实例
sketch_service = SketchService()
