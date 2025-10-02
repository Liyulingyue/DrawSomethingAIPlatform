# 🎨 DrawSomething AI Platform

## 📖 项目介绍

DrawSomething AI Platform 是一个基于 AI 的多人协作你画我猜游戏平台。该平台让玩家专注于绘画创作，而 AI 负责智能猜词识别，提供全新的游戏体验。

### ✨ 项目特色

- **🤖 AI 驱动的猜词识别**：集成多模态大模型，自动识别绘画内容
- **👥 多人实时协作**：支持多人在线绘画与实时协作猜词
- **🎨 专业画板工具**：支持压力感画笔、颜色选择、画笔粗细调节
- **📱 响应式设计**：适配桌面端和移动端设备
- **🔧 灵活配置**：支持多种 AI 模型服务（百度文心、OpenAI 等）
- **📊 游戏统计**：完整的回合历史记录和成功率统计

## 🚀 部署指南

### 环境要求

- Node.js 18+
- Python 3.8+
- Git

### 快速开始

#### 1. 克隆项目

```bash
git clone https://github.com/Liyulingyue/DrawSomethingAIPlatform.git
cd DrawSomethingAIPlatform
```

#### 2. 后端设置

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 设置环境变量（必需）
export AI_STUDIO_API_KEY="your_baidu_api_key_here"

# 启动后端服务
python run.py
```

后端将在 `http://localhost:8002` 启动。

#### 3. 前端设置

```bash
# 打开新终端，进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://localhost:5173` 启动。

#### 4. 访问应用

打开浏览器访问 `http://localhost:5173`，开始游戏！

### 开发环境设置

#### 后端开发

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AI_STUDIO_API_KEY="your_key"
python run.py
```

#### 前端开发

```bash
cd frontend
npm install
npm run dev
```

#### 代码检查

```bash
# 前端代码检查
cd frontend
npm run lint

# 构建生产版本
npm run build
```

## 📦 部署指南

### 生产环境部署

#### 1. 后端部署

```bash
# 安装生产依赖
cd backend
pip install -r requirements.txt

# 设置生产环境变量
export AI_STUDIO_API_KEY="your_production_key"
export ENVIRONMENT="production"

# 使用生产服务器运行
uvicorn app.main:app --host 0.0.0.0 --port 8002 --workers 4
```

#### 2. 前端部署

```bash
cd frontend

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 部署 dist 目录到你的 Web 服务器
```

#### 3. 使用 Docker 部署（可选）

```dockerfile
# Dockerfile 示例
FROM python:3.9-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
EXPOSE 8002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
```

### 环境变量配置

#### 必需环境变量

- `AI_STUDIO_API_KEY`: 百度 AI Studio 访问令牌

#### 可选环境变量

- `ENVIRONMENT`: 运行环境（development/production）
- `PORT`: 后端服务端口（默认 8002）

## ⚙️ 配置说明

### AI 模型配置

本项目支持多种 AI 模型服务：

#### 默认配置（百度文心一言）
- **API 端点**: `https://aistudio.baidu.com/llm/lmapi/v3`
- **推荐模型**: `ernie-4.5-vl-28b-a3b`
- **获取密钥**: https://aistudio.baidu.com/account/accessToken

#### 自定义配置
前端支持配置 OpenAI 兼容的 API：
- 模型 URL：API 端点地址
- 访问密钥：API 密钥
- 模型名称：模型标识符
- 自定义提示词：可选的提示词模板

### 前后端联调

- 后端默认端口：8002
- 前端 API 基础地址：通过 `.env` 文件配置
- 开发环境：`VITE_API_BASE_URL=http://localhost:8002`
- 生产环境：请在 `.env.production` 中设置实际地址

## 📚 API 文档

### 核心接口

- `POST /api/recognize`: 图像识别接口
- `POST /api/rooms/create`: 创建游戏房间
- `POST /api/rooms/join`: 加入游戏房间
- `POST /api/drawing/submit`: 提交绘画作品

详细 API 文档请参考后端代码中的路由定义。

## 🎮 游戏玩法

1. **创建/加入房间**：玩家创建或加入游戏房间
2. **系统生成目标词**：系统自动生成绘画目标词
3. **玩家准备**：所有玩家点击"整备完毕"
4. **轮流绘画**：玩家按顺序进行绘画创作
5. **AI 识别**：提交作品后 AI 进行智能猜词
6. **协作优化**：团队共同改进绘画，提高 AI 识别成功率

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

### 代码规范

- 后端：遵循 PEP 8 代码规范
- 前端：使用 ESLint 进行代码检查
- 提交信息：使用清晰的英文描述

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙋‍♂️ 支持

如果您有任何问题或建议：

- 提交 [GitHub Issue](https://github.com/Liyulingyue/DrawSomethingAIPlatform/issues)
- 发送邮件至项目维护者

---

**开始您的 AI 绘画猜词之旅吧！** 🎨🤖
