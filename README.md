# 🎨 DrawSomething AI Platform

## 📖 项目介绍

DrawSomething AI Platform 是一个基于 AI 的多人协作你画我猜游戏平台。该平台让玩家专注于绘画创作，而 AI 负责智能猜词识别，提供全新的游戏体验。

### ✨ 项目特色

- **🤖 AI 驱动的猜词识别**：集成多模态大模型，自动识别绘画内容
- **👥 多人实时协作**：支持多人在线绘画与实时协作猜词
- **🎨 专业画板工具**：支持压力感画笔、颜色选择、画笔粗细调节
- **📱 移动端优化体验**：全新 `/app` 路由提供专为移动设备优化```
> 💡 **配置说明**：
> - `repo_path`: Git 仓库的相对路径
> - `interval`: 检查间隔（如 "10m" 表示10分钟，"1h" 表示1小时）
> - `post_update`: 更新后执行的命令列表，按顺序执行以确保依赖关系
> - **网络超时处理**：脚本内置网络超时机制（git fetch: 30秒，git pull: 60秒），网络不稳定时会跳过更新并记录警告日志，避免脚本挂起**配置说明**：
> - `repo_path`: Git 仓库的相对路径
> - `interval`: 检查间隔（如 "10m" 表示10分钟，"1h" 表示1小时）
> - `post_update`: 更新后执行的命令列表，按顺序执行以确保依赖关系*🎯 闯关模式**：挑战不同难度的关卡，支持自定义关卡创建
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

# 设置环境变量（可选，用于 AI 功能）
export AI_STUDIO_API_KEY="your_baidu_api_key_here"  # 可选：如果前端未配置 AI 服务

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
export AI_STUDIO_API_KEY="your_key"  # 可选：用于后备 AI 服务
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
export AI_STUDIO_API_KEY="your_production_key"  # 可选：用于后备 AI 服务
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

#### 4. Docker 部署（推荐）

使用 Docker Compose 进行容器化部署，提供更好的隔离和易管理性。

**环境要求**：
- Docker 和 Docker Compose

**快速启动**：
```bash
# 克隆项目
git clone https://github.com/Liyulingyue/DrawSomethingAIPlatform.git
cd DrawSomethingAIPlatform

# 可选：设置 AI 环境变量（如果不使用前端配置）
echo "AI_STUDIO_API_KEY=your_api_key_here" > .env

# 生产环境：创建 frontend/.env.production 文件配置 API 地址
echo "VITE_API_BASE_URL=https://your-production-domain.com/api" > frontend/.env.production

# 启动服务
docker-compose up -d
```

> **生产部署说明**：
> - 确保 `frontend/.env.production` 文件包含正确的生产环境 API 地址
> - 如果使用域名访问，请配置反向代理（如 Nginx）转发到相应端口
> - 建议在生产环境中使用 HTTPS 并配置 SSL 证书

服务将在以下端口启动：
- 后端：`http://localhost:8002`
- 前端：`http://localhost:5173`

**热更新**：
使用自动热更新脚本实现无人值守的代码同步：
```powershell
cd scripts
python auto_update.py --start --verbose
```
脚本会自动检测代码变更、重新构建容器并重启服务，确保生产环境始终运行最新版本。

**停止服务**：
```bash
docker-compose down
```


### 🔄 自动热更新机制

项目提供基于 Git 的自动热更新工具，专为 Docker 部署环境优化。该工具按配置的时间间隔检查代码更新，自动拉取最新代码并重启容器，实现无人值守的持续部署。

#### 🎯 适用场景

- **生产环境部署**：确保服务始终运行最新版本
- **无人值守更新**：服务器端自动更新，无需手动干预
- **容器化管理**：充分利用 Docker 的隔离和自动化优势

#### 🛠️ 组件概览

- `scripts/auto_update.py`：主调度脚本，负责定时检查和执行更新
- `scripts/auto_update_config.json`：配置文件，定义更新任务和执行命令

#### ⚙️ 配置示例

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
          "cmd": ["docker-compose", "up", "-d"],
          "cwd": ".."
        },
        {
          "cmd": ["docker-compose", "build", "backend"],
          "cwd": ".."
        },
        {
          "cmd": ["docker-compose", "up", "-d", "backend"],
          "cwd": ".."
        },
        {
          "cmd": ["docker-compose", "exec", "frontend", "npm", "install"],
          "cwd": ".."
        },
        {
          "cmd": ["docker-compose", "restart", "frontend"],
          "cwd": ".."
        }
      ]
    }
  ]
}
```

#### 📝 本地部署配置示例

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
          "cmd": ["backend/.venv/Scripts/python.exe", "-m", "pip", "install", "-r", "requirements.txt"],
          "cwd": "../backend"
        },
        {
          "cmd": ["backend/.venv/Scripts/python.exe", "restart_backend.py"],
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

> � **配置说明**：
> - `repo_path`: Git 仓库的相对路径
> - `interval`: 检查间隔（如 "10m" 表示10分钟，"1h" 表示1小时）
> - `post_update`: 更新后执行的命令列表
> - Docker 部署使用 `docker-compose` 命令管理容器
> - 本地部署使用虚拟环境中的 Python 和直接的 npm 命令

#### 🚀 启动热更新调度

```powershell
cd scripts
python auto_update.py --start --verbose
```

**参数说明**：
- `--verbose`：输出详细日志，便于排查问题
- `--once`：仅执行一次更新检查（调试用）
- `--start`：执行初始更新并启动服务，然后持续监控（推荐用于生产）
- `--job <name>`：仅运行指定任务（可重复使用以组合多个任务）

**运行方式**：
- **Windows**：注册为计划任务
- **Linux**：使用 systemd 或 cron 持久运行
- **Docker**：在容器中作为后台进程运行

#### 🔧 自定义部署命令

**Docker 部署命令**：
- `docker-compose build <service>`：重新构建指定服务
- `docker-compose up -d <service>`：启动/重启指定服务
- `docker-compose exec <service> <command>`：在运行中的容器中执行命令
- `docker-compose restart <service>`：重启指定服务

**本地部署命令**：
- 后端：使用虚拟环境中的 Python 执行更新和重启
- 前端：直接使用 npm 进行依赖安装和构建
- 支持 PID 文件管理，确保服务正确重启

**配置建议**：
- 单仓库场景推荐单一 Job，避免重复的 git 操作
- `post_update` 命令按执行顺序排列
- 使用对象格式配置命令，支持 `cwd`（工作目录）和 `cmd`（命令）
- 确保命令能够快速完成，避免阻塞调度器

### 环境变量配置

#### 必需环境变量

无

#### 可选环境变量

- `AI_STUDIO_API_KEY`: 百度 AI Studio 访问令牌（可选，用于后备 AI 服务）
  - 如果前端未配置自定义 AI 服务，将使用此密钥调用百度文心一言 API
  - 获取方式：https://aistudio.baidu.com/account/accessToken

## ⚙️ 配置说明

### AI 模型配置

本项目支持灵活的 AI 模型配置：

#### 主要配置方式（推荐）
通过前端界面配置 AI 服务：
- 访问 `/app/configAI` 页面
- 支持 OpenAI 兼容的 API 接口
- 配置包括：API 端点、访问密钥、模型名称、自定义提示词

#### 后备配置方式
设置环境变量 `AI_STUDIO_API_KEY`：
- **API 端点**: `https://aistudio.baidu.com/llm/lmapi/v3`
- **推荐模型**: `ernie-4.5-vl-28b-a3b`
- **获取密钥**: https://aistudio.baidu.com/account/accessToken

> **注意**：系统优先使用前端配置的 AI 服务。如果前端未配置任何 AI 服务，则自动回退到环境变量配置的百度文心一言 API。

### 前后端联调

- 后端默认端口：8002
- 前端 API 基础地址：通过 `.env` 文件配置
- 开发环境：`VITE_API_BASE_URL=http://localhost:8002`
- 生产环境：请在 `.env.production` 中设置实际地址

#### 🔧 环境配置文件

**开发环境** (`.env`)：
```bash
# 可选：设置 AI API 密钥（如果不使用前端配置）
AI_STUDIO_API_KEY=your_api_key_here
```

**生产环境** (`frontend/.env.production`)：
```bash
# 生产环境后端 API 地址
VITE_API_BASE_URL=https://your-production-domain.com/api
```

> **注意**：
> - `frontend/.env.production` 文件会被 Vite 自动加载用于生产构建
> - Docker 部署时，确保将 `frontend/.env.production` 文件放在 frontend 目录下
> - 如果使用自动更新脚本，请确保生产环境的 `frontend/.env.production` 文件已正确配置

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
