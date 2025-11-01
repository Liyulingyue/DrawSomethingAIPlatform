# 🎨 DrawSomething AI Platform

## 📖 项目介绍

DrawSomething AI Platform 是一个基于 AI 的多人协作你画我猜游戏平台。该平台让玩家专注于绘画创作，而 AI 负责智能猜词识别，提供全新的游戏体验。

### ✨ 项目特色

- **🤖 AI 驱动的猜词识别**：集成多模态大模型，自动识别绘画内容
- **👥 多人实时协作**：支持多人在线绘画与实时协作猜词
- **🎨 专业画板工具**：支持压力感画笔、颜色选择、画笔粗细调节
- **📱 移动端优化体验**：全新 `/app` 路由提供专为移动设备优化
- **🛡️ 管理员管理**：提供管理员登录和画廊内容管理功能
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
- **🔐 管理员登录** (`/app/login`)：管理员账号登录，获取管理权限
- **🖼️ 画廊管理** (`/app/gallery`)：查看和删除画廊中的画作（需要管理员权限）

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
export MODEL_KEY="your_baidu_api_key_here"  # 可选：如果前端未配置 AI 服务

# 配置数据库连接（必需）
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/drawsomething"

# 配置管理员账号（必需）
# 编辑 backend/.env 文件设置管理员账号：
# ADMIN_USER=admin
# ADMIN_PASSWORD=your_password

# 启动后端服务
python run.py
```

后端将在 `http://localhost:8002` 启动。

#### 3. 前端设置

```bash
# 打开新终端，进入前端目录
cd frontend

# 配置环境变量（重要）
cp .env.development.example .env.development  # 开发环境
cp .env.production.example .env.production   # 生产环境（如果需要）

# 编辑环境变量文件，根据需要修改配置
# .env.development: 开发环境配置
# .env.production: 生产环境配置

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

> 📝 **环境变量说明**：
> - `.env.development.example` 和 `.env.production.example` 是配置模板
> - 复制到 `.env.development` 或 `.env.production` 并修改实际值
> - 这些文件已被 `.gitignore` 排除，不会提交到版本控制
> - 主要配置项：`VITE_API_BASE_URL`（后端API地址）

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

## 👤 用户系统说明

### 用户登录

DrawSomething AI Platform 支持用户注册和登录系统，为您提供个性化的游戏体验：

#### 普通用户登录
- **自动注册**：首次使用时无需手动注册，输入用户名和密码即可自动创建账号
- **持久登录**：登录状态会自动保存，支持会话恢复
- **安全验证**：密码经过加密存储，保护您的账号安全

#### 管理员登录
- **专用入口**：访问 `/app/login` 页面使用管理员账号登录
- **管理权限**：获得画廊内容管理和系统维护权限
- **配置要求**：管理员账号需要在后端环境变量中预先配置

### 点数系统

平台采用点数系统来管理AI服务的调用次数，确保公平使用：

#### 点数获取
- **新用户赠送**：新注册用户自动获得初始点数
- **充值购买**：在登录状态下可以购买更多点数
- **管理员赠送**：管理员可以为用户增加点数

#### 点数消耗
- **服务器AI调用**：使用平台提供的AI服务进行图像识别时消耗1个点数
- **自定义AI**：使用自己配置的AI服务不消耗平台点数
- **免费额度**：部分功能可能提供免费使用额度

#### 点数管理
- **实时显示**：登录后在页面顶部显示当前剩余点数
- **使用记录**：系统记录每次AI调用的消耗情况
- **余额提醒**：点数不足时会提示用户充值或切换到自定义AI模式

#### 使用建议
1. **选择合适的AI模式**：
   - 点数充足时：使用"服务器调用点"获得最佳体验
   - 点数不足时：配置自定义AI服务继续使用
2. **合理规划使用**：根据需要选择绘画模式，避免不必要的AI调用
3. **及时充值**：点数不足时可以随时购买更多额度

> **提示**：自定义AI配置可以让您使用自己的API密钥，完全免费使用AI功能！

### 开发环境设置

#### 后端开发

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export MODEL_KEY="your_key"  # 可选：用于后备 AI 服务

# 配置管理员账号（必需）
# 编辑 .env 文件设置管理员账号：
# ADMIN_USER=admin
# ADMIN_PASSWORD=your_password

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
export MODEL_KEY="your_production_key"  # 可选：用于后备 AI 服务

# 配置管理员账号（必需）
# 编辑 backend/.env 文件设置管理员账号：
# ADMIN_USER=admin
# ADMIN_PASSWORD=your_secure_password

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

##### 快速开始（试用环境）

使用开发环境配置文件进行快速试用，适合开发调试和功能体验：

```bash
# 克隆项目
git clone https://github.com/Liyulingyue/DrawSomethingAIPlatform.git
cd DrawSomethingAIPlatform

# 启动开发环境（包含数据库和Adminer）
docker-compose -f docker-compose.dev.yml up -d

# 服务将在以下端口启动：
# - 后端：http://localhost:8002
# - 前端：http://localhost:5173
# - Adminer（数据库管理）：http://localhost:8080
# - 数据库：localhost:5432 (外部可访问，便于开发调试)
```

**开发环境特点**：
- 支持源代码热重载
- 数据库端口对外暴露
- 包含 Adminer 数据库管理工具
- 适合开发和测试

##### 生产部署

使用生产环境配置文件进行正式部署，优化安全性和性能：

```bash
# 克隆项目
git clone https://github.com/Liyulingyue/DrawSomethingAIPlatform.git
cd DrawSomethingAIPlatform

# 可选：设置 AI 环境变量（如果不使用前端配置）
echo "MODEL_KEY=your_api_key_here" > .env

# 必需：设置管理员账号
echo "ADMIN_USER=admin" >> .env
echo "ADMIN_PASSWORD=your_secure_password" >> .env

# 生产环境：创建 frontend/.env.production 文件配置 API 地址
echo "VITE_API_BASE_URL=https://your-production-domain.com/api" > frontend/.env.production

# 启动生产环境
docker-compose up -d

# 服务将在以下端口启动：
# - 后端：http://localhost:8002
# - 前端：http://localhost:5173
```

**生产环境特点**：
- 数据库端口不对外暴露，提高安全性
- 不包含开发工具（如 Adminer）
- 后端使用构建镜像，不挂载源代码
- 适合生产环境部署

> **环境选择建议**：
> - **首次试用**：使用 `docker-compose.dev.yml` 快速体验所有功能
> - **生产部署**：使用 `docker-compose.yml` 获得更好的安全性和性能
> - **开发调试**：使用 `docker-compose.dev.yml` 
```

> **生产部署说明**：
> - **环境变量配置**：确保 `frontend/.env.production` 文件存在并包含正确的生产环境 API 地址
>   - 复制 `frontend/.env.production.example` 到 `frontend/.env.production`
>   - 修改 `VITE_API_BASE_URL` 为实际的生产后端地址
> - 如果使用域名访问，请配置反向代理（如 Nginx）转发到相应端口
> - 建议在生产环境中使用 HTTPS 并配置 SSL 证书

服务将在以下端口启动：
- 后端：`http://localhost:8002`
- 前端：`http://localhost:5173`
- Adminer（数据库管理）：`http://localhost:8080`
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
          "cmd": ["backend/.venv/Scripts/python.exe", "-m", "alembic", "upgrade", "head"],
          "cwd": "../backend"
        },
        {
          "cmd": ["echo", "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/drawsomething", ">", ".env"],
          "cwd": "../backend"
        },
        {
          "cmd": ["echo", "ADMIN_USER=admin", ">", ".env"],
          "cwd": "../backend"
        },
        {
          "cmd": ["echo", "ADMIN_PASSWORD=your_secure_password", ">>", ".env"],
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
> - 数据库和管理员配置会自动写入 `backend/.env` 文件

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

#### 前端环境变量

项目使用以下环境变量文件进行配置：

- **开发环境**: `frontend/.env.development`
- **生产环境**: `frontend/.env.production`
- **配置模板**: `frontend/.env.development.example` 和 `frontend/.env.production.example`

##### 必需环境变量

- `VITE_API_BASE_URL`: 后端 API 基础地址
  - 开发环境：`http://localhost:8002`
  - 生产环境：`https://your-production-domain.com`

##### 配置步骤

1. 复制示例文件：
   ```bash
   cp frontend/.env.development.example frontend/.env.development
   cp frontend/.env.production.example frontend/.env.production
   ```

2. 根据部署环境修改 `VITE_API_BASE_URL` 的值

> **注意**：实际的环境变量文件（`.env.development` 和 `.env.production`）已被 `.gitignore` 排除，不会提交到版本控制。

#### 后端环境变量

##### 必需环境变量

- `DATABASE_URL`: PostgreSQL数据库连接URL
  - 格式: `postgresql://username:password@host:port/database`
  - Docker环境: `postgresql://postgres:postgres@db:5432/drawsomething`
  - 本地开发: `postgresql://postgres:postgres@localhost:5432/drawsomething`

##### 可选环境变量

- `MODEL_KEY`: 百度 AI Studio 访问令牌（可选，用于后备 AI 服务）
  - 如果前端未配置自定义 AI 服务，将使用此密钥调用百度文心一言 API
  - 获取方式：https://aistudio.baidu.com/account/accessToken
- `MODEL_URL`: 自定义 AI 模型 API 端点 URL（可选）
  - 用于配置自定义 AI 服务的 API 地址
- `MODEL_KEY`: 自定义 AI 模型 API 密钥（可选）
  - 用于配置自定义 AI 服务的访问密钥
- `MODEL_NAME`: AI 模型名称（可选）
  - 默认值：`ernie-4.5-vl-28b-a3b`
  - 用于指定使用的 AI 模型名称

##### 管理员配置

- `ADMIN_USER`: 管理员用户名（必需，用于管理员登录）
- `ADMIN_PASSWORD`: 管理员密码（必需，用于管理员登录）

> **管理员配置说明**：
> - 编辑 `backend/.env` 文件设置管理员账号密码
> - 示例配置：
>   ```
>   ADMIN_USER=admin
>   ADMIN_PASSWORD=your_secure_password
>   ```
> - 管理员可以登录 `/app/login` 页面
> - 管理员权限包括删除画廊中的画作

## ⚙️ 配置说明

### AI 模型配置

本项目支持灵活的 AI 模型配置：

#### 主要配置方式（推荐）
通过前端界面配置 AI 服务：
- 访问 `/app/configAI` 页面
- 支持 OpenAI 兼容的 API 接口
- 配置包括：API 端点、访问密钥、模型名称、自定义提示词

#### 后备配置方式
设置环境变量 `MODEL_KEY`：
- **API 端点**: `https://aistudio.baidu.com/llm/lmapi/v3`
- **推荐模型**: `ernie-4.5-vl-28b-a3b`（可通过 `MODEL_NAME` 环境变量自定义）
- **获取密钥**: https://aistudio.baidu.com/account/accessToken

#### 自定义 AI 模型配置
通过环境变量配置自定义 AI 模型：
- `MODEL_URL`: 自定义模型 API 端点
- `MODEL_KEY`: 自定义模型 API 密钥  
- `MODEL_NAME`: 自定义模型名称

> **注意**：系统优先使用前端配置的 AI 服务。如果前端未配置任何 AI 服务，则自动回退到环境变量配置的百度文心一言 API。

### 前后端联调

- 后端默认端口：8002
- 前端 API 基础地址：通过 `.env` 文件配置
- 开发环境：`VITE_API_BASE_URL=http://localhost:8002`
- 生产环境：请在 `.env.production` 中设置实际地址

#### 🔧 环境配置文件

**开发环境** (`.env`)：
```bash
# 必需：数据库连接配置（Docker环境）
DATABASE_URL=postgresql://postgres:postgres@db:5432/drawsomething

# 可选：设置 AI API 密钥（如果不使用前端配置）
MODEL_KEY=your_api_key_here

# 可选：自定义 AI 模型配置
MODEL_URL=http://your-custom-model-api.com/v1
MODEL_KEY=your_custom_model_key
MODEL_NAME=your-custom-model-name

# 必需：管理员配置
ADMIN_USER=admin
ADMIN_PASSWORD=your_secure_password
```

**生产环境** (`frontend/.env.production`)：
```bash
# 生产环境后端 API 地址
VITE_API_BASE_URL=https://your-production-domain.com/api
```

**后端环境** (`backend/.env`)：
```bash
# 必需：数据库连接配置
DATABASE_URL=postgresql://postgres:postgres@db:5432/drawsomething

# 可选：AI API 密钥（如果不使用前端配置）
MODEL_KEY=your_production_api_key

# 可选：自定义 AI 模型配置
MODEL_URL=http://your-production-model-api.com/v1
MODEL_KEY=your_production_model_key
MODEL_NAME=your-production-model-name

# 必需：管理员配置
ADMIN_USER=admin
ADMIN_PASSWORD=your_secure_password
```

> **注意**：
> - `frontend/.env.production` 文件会被 Vite 自动加载用于生产构建
> - `backend/.env` 文件会被 python-dotenv 自动加载用于后端配置
> - Docker 部署时，确保将 `frontend/.env.production` 和 `backend/.env` 文件放在对应目录下
> - 如果使用自动更新脚本，请确保生产环境的配置文件已正确配置

### 🗄️ 数据库配置

项目使用 PostgreSQL 作为数据库，支持用户认证和会话管理。

#### 开发环境单独启动数据库

在开发过程中，如果只需要启动数据库服务而不想启动整个应用栈，可以单独启动数据库：

```bash
# 仅启动数据库和Adminer
docker-compose up -d db adminer

# 或者仅启动数据库
docker-compose up -d db
```

数据库服务启动后：
- **PostgreSQL**: `localhost:5432`
- **Adminer**: `http://localhost:8080` (如果启动了Adminer)

#### Docker 环境数据库配置

使用 Docker Compose 启动 PostgreSQL 和 Adminer（数据库管理界面）：

```bash
# 启动数据库服务
docker-compose up -d db adminer
```

服务启动后：
- **PostgreSQL**: `localhost:5432`
- **Adminer**: `http://localhost:8080`

#### Adminer 数据库管理

1. 打开浏览器访问 `http://localhost:8080`
2. 登录信息：
   - **系统**: PostgreSQL
   - **服务器**: `db` (Docker) 或 `localhost` (本地)
   - **用户名**: `postgres`
   - **密码**: `postgres`
   - **数据库**: `drawsomething`

#### 本地开发数据库配置

如果不使用 Docker，可以安装本地 PostgreSQL：

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS (使用 Homebrew)
brew install postgresql

# Windows
# 下载并安装 PostgreSQL: https://www.postgresql.org/download/windows/
```

创建数据库：
```sql
CREATE DATABASE drawsomething;
```

更新 `backend/.env` 中的 `DATABASE_URL`：
```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/drawsomething
```

#### 数据库迁移

项目使用 Alembic 进行数据库版本控制和迁移管理，支持自动生成和应用数据库模式变更。

##### 初始化数据库迁移

首次设置项目时，需要创建初始迁移：

```bash
# 进入后端目录
cd backend

# 生成初始迁移（自动检测当前模型）
alembic revision --autogenerate -m "initial migration"

# 应用迁移到数据库
alembic upgrade head
```

##### 自动迁移应用

**本项目已集成自动迁移应用**，后端启动时会自动执行数据库迁移，无需手动操作。

```bash
# 正常启动后端即可，迁移会自动应用
cd backend
python run.py
```

启动日志会显示：
```
正在应用数据库迁移...
数据库迁移应用完成
INFO:     Started server process [...]
```

如果迁移失败，应用会继续启动但可能出现数据库错误。

##### 手动迁移管理

如果需要手动管理迁移：

```bash
# 进入后端目录
cd backend

# 生成新的迁移文件
alembic revision --autogenerate -m "描述变更内容"

# 手动应用迁移
alembic upgrade head

# 检查状态
alembic status

# 查看历史
alembic history
```

##### 常用 Alembic 命令

```bash
# 查看当前迁移状态
alembic current

# 查看迁移历史
alembic history

# 回滚到指定版本
alembic downgrade <revision_id>

# 查看待应用的迁移
alembic show <revision_id>

# 应用所有待处理的迁移到最新版本
alembic upgrade head

# 应用到指定版本
alembic upgrade <revision_id>

# 回滚一步（回到上一个版本）
alembic downgrade -1

# 查看迁移状态（哪些已应用，哪些待应用）
alembic status

# 生成空的迁移文件（手动编写迁移逻辑）
alembic revision -m "migration message"

# 强制标记迁移为已应用（危险操作，仅在确定时使用）
alembic stamp head

# 查看数据库中的当前版本
alembic current

# 检查迁移文件是否有语法错误
alembic check
```

##### 迁移文件管理

```bash
# 查看迁移文件内容
alembic show <revision_id>

# 编辑迁移文件（如果需要手动调整）
# 编辑 backend/alembic/versions/<revision_id>_<message>.py

# 删除错误的迁移文件（如果还没应用）
# 直接删除 backend/alembic/versions/ 下的文件
```

##### 生产环境部署

```bash
# 在生产环境中应用迁移（建议在应用启动前执行）
alembic upgrade head

# 检查迁移状态
alembic status

# 如果需要回滚（谨慎操作）
alembic downgrade <safe_revision_id>
```

> **注意**：
> - 生产环境部署时，请确保在部署前应用所有迁移
> - 建议在 CI/CD 流程中包含 `alembic upgrade head` 步骤
> - 回滚操作可能导致数据丢失，请谨慎使用
> - 本项目已集成自动迁移应用，后端启动时会自动执行 `alembic upgrade head`

#### 画廊数据库迁移

项目已将画廊功能完全迁移到数据库，图片数据直接存储在数据库中，无需文件系统支持。

**迁移步骤：**
```bash
# 进入后端目录
cd backend

# 运行迁移脚本（将gallery.json和图片文件数据完全迁移到数据库）
python migrate_gallery.py
```

迁移完成后，原`gallery.json`文件会被备份为`gallery.json.backup`，图片文件数据会完全导入到数据库中，旧的图片文件可以安全删除。

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

> **登录提示**：闯关模式需要用户登录才能保存进度和使用AI识别功能。未登录用户可以体验绘画功能，但无法使用AI猜词。

### 自由绘画模式

1. **进入自由绘画**：选择任意词语进行创作
2. **AI配置选择**：
   - **服务器调用点**：使用平台AI服务（需消耗点数）
   - **自定义AI**：使用个人配置的AI服务（免费）
3. **提交识别**：AI分析您的绘画并给出猜测结果
4. **保存作品**：优秀的作品可以发布到画廊分享

> **点数说明**：使用服务器AI服务需要消耗调用点数。建议先配置自定义AI服务以节省点数，或及时充值保持充足额度。

### 桌面端多人游戏模式

1. **访问桌面端主页**：打开主站首页 `/`
2. **创建或加入房间**：创建新的游戏房间或加入现有房间
3. **邀请好友**：分享房间ID让其他玩家加入
4. **轮流绘画**：每轮一位玩家绘画，其他玩家实时猜测
5. **AI辅助验证**：系统使用AI验证绘画准确性和猜测结果
6. **计分系统**：根据猜测正确度和绘画质量进行评分

> **多人游戏要求**：需要用户登录才能创建和加入游戏房间。游戏过程中会消耗AI调用点数用于绘画验证和结果确认。

### 管理员功能

#### 管理员登录
1. **访问管理员登录页面**：打开 `/app/login`
2. **输入管理员账号**：使用配置的管理员用户名和密码登录
3. **获取管理权限**：登录成功后获得管理员权限，状态会自动保存

#### 画廊管理
1. **访问画廊页面**：登录管理员账号后访问 `/app/gallery`
2. **查看画廊作品**：浏览所有用户上传的画作
3. **删除不当内容**：点击画作上的删除按钮（红色垃圾桶图标）移除不合适的画作
4. **实时更新**：删除操作立即生效，画廊列表实时更新

> **管理员权限说明**：
> - 只有管理员账号登录后才能看到删除按钮
> - 删除操作不可恢复，请谨慎使用
> - 管理员状态会持久化保存，下次访问时自动恢复

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
| `/app/login` | 管理员登录 | 管理员账号登录页面 |
| `/app/gallery` | 画廊管理 | 查看和管理画廊作品（管理员权限）|

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
