# 🎨 DrawSomething AI Platform

## 📖 项目介绍

DrawSomething AI Platform 是一个基于 AI 的多人协作你画我猜游戏平台。该平台让玩家专注于绘画创作，而 AI 负责智能猜词识别，提供全新的游戏体验。

### ✨ 项目特色

- **🤖 AI 驱动的猜词识别**：集成多模态大模型，自动识别绘画内容
- **👥 多人实时协作**：支持多人在线绘画与实时协作猜词
- **🎨 专业画板工具**：支持压力感画笔、颜色选择、画笔粗细调节
- **📱 移动端优化体验**：全新 `/app` 路由提供专为移动设备优化的界面
- **🎯 闯关模式**：挑战不同难度的关卡，支持自定义关卡创建
- **🔧 灵活配置**：支持多种 AI 模型服务（百度文心、OpenAI 等）
- **📊 游戏统计**：完整的回合历史记录和成功率统计

## 🎮 功能模块

### 移动端应用路由 (`/app`)

专为移动端和触屏设备优化的新版界面：

- **🏠 主页** (`/app/home`)：快速导航到各个功能模块
- **🏆 闯关模式** (`/app/level-set`)：挑战预设和自定义关卡
  - 多个预设主题关卡（动物、水果、日常物品等）
  - 支持创建和管理自定义关卡
  - 关卡进度自动保存
- **➕ 自定义关卡** (`/app/level-config`)：创建个性化挑战关卡
- **✏️ 自由绘画** (`/app/draw`)：无压力的自由创作模式
- **📖 使用说明** (`/app/introduction`)：详细的游戏玩法指南
- **⚙️ AI 配置** (`/app/configAI`)：自定义 AI 模型设置

> **注意**：移动端路由暂不支持多人对战模式，专注于单人闯关和自由创作体验。

### 桌面端对战模式 (`/`)

完整的多人协作游戏体验：
- 创建/加入房间
- 实时多人绘画协作
- AI 智能猜词与评分
- 回合历史记录

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

打开浏览器访问应用：

- **桌面端多人对战**：`http://localhost:5173`
- **移动端优化版**：`http://localhost:5173/app/home`

> 💡 **推荐**：在移动设备上使用 `/app` 路由获得更好的触屏体验！

## 📱 移动端使用建议

### 推荐浏览器
- iOS: Safari, Chrome
- Android: Chrome, Firefox, Edge

### 最佳体验设置
1. 使用横屏模式获得更大绘画区域
2. 在 AI 配置页面设置您的 API 密钥（首次使用）
3. 从主页导航到闯关模式或自由绘画
4. 绘画时支持多点触控和压感（部分设备）

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

### 🔄 自动热更新机制

为了在部署后自动同步最新代码，项目提供了一个基于 Git 的热更新工具。该工具会按配置的时间间隔执行 `git fetch` / `git pull` 并触发部署脚本，实现每 10 分钟 / 1 小时一次的自动更新。

#### 组件概览

- `scripts/auto_update.py`：主调度脚本，按计划检查仓库是否有新提交。
- `scripts/auto_update_config.json`：调度配置，描述每个任务的仓库位置、分支、间隔和更新后需要执行的命令。
- `scripts/restart_backend.py`：在后台重启后端服务，确保不会阻塞调度器。

#### 配置文件示例

```json
{
  "default_branch": "main",
  "default_interval": "10m",
  "jobs": [
    {
      "name": "fullstack",
      "repo_path": "..",
      "interval": "10m",
      "post_update": [
        {
          "cmd": ["python", "-m", "pip", "install", "-r", "requirements.txt"],
          "cwd": "../backend"
        },
        {
          "cmd": ["python", "restart_backend.py"],
          "cwd": "."
        },
        {
          "cmd": ["npm", "install"],
          "cwd": "../frontend"
        },
        {
          "cmd": ["npm", "run", "build"],
          "cwd": "../frontend"
        }
      ]
    }
  ]
}
```

> 📝 提示：单仓库场景下推荐使用单一 Job（示例中每 10 分钟轮询一次），即可确保只执行一次 `git fetch` / `git pull`，再顺序触发后端和前端的部署命令。`post_update` 支持字符串或对象配置；对于需要后台启动的脚本（例如重启服务），请使用对象形式并确保命令能够快速结束。

#### 启动热更新调度

```powershell
cd scripts
python auto_update.py --verbose
```

- `--verbose`：输出更详细的日志，便于排查问题。
- `--once`：只运行一次轮询，通常用于调试。
- `--job backend`：只运行指定任务，参数可重复以组合多个任务。

建议在 Windows 环境下将该命令注册为计划任务，或在 Linux 服务器中借助 systemd / cron 持久运行。

#### 自定义部署命令

- 若需额外的构建或迁移步骤，可在配置文件中追加命令。
- 对于需要停机更新的服务，可编写自定义脚本并在 `post_update` 中调用。
- `scripts/restart_backend.py` 使用 PID 文件确保不会产生僵尸进程，若部署在其他环境，可参考该脚本编写自定义的重启逻辑。

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

### 移动端闯关模式（推荐新手）

1. **访问移动端主页**：打开 `/app/home`
2. **选择闯关模式**：进入预设或自定义关卡
3. **查看目标词**：系统显示需要绘画的关键词
4. **开始绘画**：使用触屏画板进行创作
5. **提交作品**：AI 自动识别并判断是否成功
6. **继续挑战**：成功后自动进入下一关

### 桌面端多人对战模式

1. **创建/加入房间**：玩家创建或加入游戏房间
2. **系统生成目标词**：系统自动生成绘画目标词
3. **玩家准备**：所有玩家点击"整备完毕"
4. **轮流绘画**：玩家按顺序进行绘画创作
5. **AI 识别**：提交作品后 AI 进行智能猜词
6. **协作优化**：团队共同改进绘画，提高 AI 识别成功率

## 🎯 功能路由说明

### 移动端路由 (`/app/*`)
| 路由 | 功能 | 说明 |
|------|------|------|
| `/app/home` | 主页 | 移动端首页，快速导航 |
| `/app/level-set` | 闯关模式 | 挑战预设和自定义关卡 |
| `/app/level-config` | 关卡配置 | 创建和管理自定义关卡 |
| `/app/draw` | 自由绘画 | 无限制的自由创作模式 |
| `/app/challenge-draw` | 挑战绘画 | 闯关模式绘画页面 |
| `/app/introduction` | 使用说明 | 详细的功能介绍和帮助 |
| `/app/configAI` | AI 配置 | 自定义 AI 模型设置 |

### 桌面端路由 (`/*`)
| 路由 | 功能 | 说明 |
|------|------|------|
| `/` | 登录/主页 | 用户登录和主导航 |
| `/room` | 房间列表 | 查看和加入游戏房间 |
| `/single-game` | 单人游戏 | 单人练习模式 |
| `/multiplayer-game` | 多人游戏 | 多人协作对战 |
| `/drawing-room` | 绘画房间 | 多人绘画协作空间 |

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
