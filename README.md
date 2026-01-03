# 🎨 DrawSomething AI Platform

## 📖 Project Introduction

DrawSomething AI Platform is an AI-powered drawing challenge game platform. This platform lets players focus on drawing creation while AI handles intelligent content recognition, providing an entirely new gaming experience.

### 📑 Quick Navigation

- **🚀 Deployment** → [Quick Start](#quick-start) | [Production Deployment](#production-deployment-options) | [Docker](#docker-deployment-recommended)
- **⚙️ Configuration** → [Environment Variables](#environment-variable-configuration) | [Database](#database-configuration) | [AI Services](#important-ai-service-configuration)
- **🎮 Usage** → [Feature Modules](#feature-modules) | [Gameplay](#gameplay) | [API](#api-documentation)

### ⚡ Quick Start

**First time using?** Check out the [AI Configuration Quick Guide](docs/AI_CONFIG_GUIDE.md) to get started in 3 minutes!

### ✨ Project Features

- **🤖 AI-Powered Image Recognition**: Integrates multimodal large language models for automatic drawing content recognition
- **🎨 Professional Drawing Board**: Supports pressure-sensitive brushes, color selection, and brush size adjustment
- **📱 Mobile-Optimized Experience**: Interface optimized for mobile devices and touch screens
- **🛡️ Admin Management**: Admin login and gallery content management features
- **🎯 Drawing Challenges**: Challenge levels of different difficulties with support for custom level creation
- **🔧 Flexible Configuration**: Support for multiple AI model services (Baidu Wenxin, OpenAI, etc.)
- **🖼️ Gallery System**: Save and share your drawing works

## 🎮 Feature Modules

- **🏠 Home** (`/app/home`): Quick navigation to various function modules
- **🏆 Drawing Challenges** (`/app/level-set`): Challenge preset and custom levels
  - Multiple preset themed levels (animals, fruits, everyday items, etc.)
  - Support for creating and managing custom levels
  - Automatic level progress saving
- **➕ Custom Levels** (`/app/level-config`): Create personalized challenge levels
- **✏️ Free Drawing** (`/app/draw`): Stress-free creative mode
- **📖 Instructions** (`/app/introduction`): Detailed gameplay guide
- **⚙️ AI Configuration** (`/app/configAI`): Customize AI model settings
- **🔐 Admin Login** (`/app/login`): Admin account login for admin privileges
- **🖼️ Gallery Management** (`/app/gallery`): View and delete gallery artwork (requires admin privileges)

## 🚀 Deployment Guide

### System Requirements

- Node.js 18+
- Python 3.8+
- Git

### Quick Start

#### 1. Clone the Project

```bash
git clone https://github.com/Liyulingyue/DrawSomethingAIPlatform.git
cd DrawSomethingAIPlatform
```

#### 2. Backend Setup

```bash
# Enter backend directory
cd backend

# Create virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional, for AI features)
export MODEL_KEY="your_baidu_api_key_here"  # Optional: if not configured on frontend

# Configure database connection (required)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/drawsomething"

# Configure admin account (required)
# Edit backend/.env file to set admin credentials:
# ADMIN_USER=admin
# ADMIN_PASSWORD=your_password

# Start backend service
python run.py
```

Backend will start at `http://localhost:8002`.

#### 3. Frontend Setup

```bash
# Open new terminal, enter frontend directory
cd frontend

# Configure environment variables (important)
cp .env.development.example .env.development  # development environment
cp .env.production.example .env.production   # production environment (if needed)

# Edit environment variable files, modify configuration as needed
# .env.development: development environment configuration
# .env.production: production environment configuration

# Install dependencies
npm install

# Start development server
npm run dev
```

> 📝 **Environment Variables Notes**:
> - `.env.development.example` and `.env.production.example` are configuration templates
> - Copy to `.env.development` or `.env.production` and modify actual values
> - These files are excluded by `.gitignore` and won't be committed to version control
> - Main configuration item: `VITE_API_BASE_URL` (backend API address)

Frontend will start at `http://localhost:5173`.

#### 4. Access the Application

Open your browser to access the application:

- **Desktop Multi-Player Mode**: `http://localhost:5173`
- **Mobile Optimized Version**: `http://localhost:5173/app/home`

> 💡 **Recommendation**: Use the `/app` route on mobile devices for better touch screen experience!

## 📦 Desktop App Packaging Guide (Tauri)

This project supports packaging as a standalone Windows desktop application (.exe) with embedded backend and database, requiring no manual environment configuration from users.

### Prerequisites

- **Node.js** (>= 16.0)
- **Python** (>= 3.8)
- **Rust** (must be installed and properly configured)

### One-Click Packaging (Recommended)

We provide one-click packaging scripts that automatically handle dependencies, build frontend and backend, and generate installers:

```powershell
cd scripts
.\build_tauri.ps1
```

The script automatically:
1. Downloads embedded PostgreSQL database
2. Builds frontend assets
3. Packages backend as standalone executable
4. Packages Tauri application

### Packaging Artifacts

After packaging completes, files are located in `frontend/src-tauri/target/release/bundle/`:
- `nsis/*.exe`: Portable/Installer version
- `msi/*.msi`: Windows installer package

> 📖 **Detailed Guide**: For more advanced configuration, step-by-step packaging process, and troubleshooting, please refer to [TAURI_BUILD_GUIDE.md](docs/TAURI_BUILD_GUIDE.md).

## 📱 Mobile Usage Recommendations

### Recommended Browsers
- iOS: Safari, Chrome
- Android: Chrome, Firefox, Edge

### Optimal Experience Settings
1. Use landscape mode for larger drawing area
2. Configure your API key on the AI configuration page (first use)
3. Navigate from home page to drawing challenges or free drawing
4. Multi-touch and pressure sensitivity supported (some devices)

## 👤 User System Explanation

### User Login

DrawSomething AI Platform supports user registration and login system for personalized gaming experience:

#### Regular User Login
- **Auto Registration**: No manual registration needed on first use, just enter username and password to auto-create account
- **Persistent Login**: Login state automatically saved with session recovery support
- **Secure Authentication**: Passwords encrypted and stored securely

#### Admin Login
- **Dedicated Entry**: Access `/app/login` page with admin account
- **Admin Privileges**: Gain gallery content management and system maintenance privileges
- **Configuration Required**: Admin account must be pre-configured in backend environment variables

### Points System

The platform uses a points system to manage AI service call usage, ensuring fair access:

#### Earning Points
- **New User Bonus**: New registered users automatically receive initial points
- **Purchase**: Buy additional points when logged in
- **Admin Grant**: Admins can grant points to users

#### Points Consumption
- **Server AI Calls**: Consume 1 point per server-provided AI image recognition
- **Custom AI**: Using personal configured AI service doesn't consume platform points
- **Free Tier**: Some features may offer free usage

#### Points Management
- **Real-time Display**: Current remaining points shown at top of page when logged in
- **Usage History**: System records every AI call consumption
- **Low Balance Alert**: Notified to recharge or switch to custom AI mode when points run low

#### Usage Tips
1. **Choose appropriate AI mode**:
   - When points sufficient: Use "Server Call Points" for best experience
   - When points low: Configure custom AI service to continue using
2. **Plan usage wisely**: Choose drawing mode based on needs to avoid unnecessary AI calls
3. **Recharge timely**: Can purchase additional points anytime when running low

> **Tip**: Custom AI configuration lets you use your own API key for completely free AI functionality!

## 📦 Production Deployment Options

### Option 1: Local Production Deployment

```bash
# Backend
cd backend
pip install -r requirements.txt
export MODEL_KEY="your_production_key"  # Optional
export ENVIRONMENT="production"
uvicorn app.main:app --host 0.0.0.0 --port 8002 --workers 4

# Frontend
cd frontend
npm run build
# Deploy dist directory to web server
```

### Option 2: Docker Deployment (Recommended)

#### Development Environment

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Features: Source code hot reload, exposed database port, includes Adminer tool.

#### Production Environment

```bash
echo "MODEL_KEY=your_api_key_here" > .env
echo "ADMIN_USER=admin" >> .env
echo "ADMIN_PASSWORD=your_secure_password" >> .env
echo "VITE_API_BASE_URL=https://your-production-domain.com/api" > frontend/.env.production
docker-compose up -d
```

Features: High security, isolated database, no development tools.

### 🔄 Automatic Hot Update Mechanism

The project provides Git-based automatic hot update tools optimized for Docker deployment environments. The tool checks for code updates at configured intervals, automatically pulls latest code and restarts containers, enabling unattended continuous deployment.

#### 🎯 Use Cases

- **Production Deployment**: Ensure service always runs latest version
- **Unattended Updates**: Server auto-updates without manual intervention
- **Container Management**: Leverage Docker isolation and automation

#### 🛠️ Component Overview

- `scripts/auto_update.py`: Main scheduling script responsible for checking and executing updates
- `scripts/auto_update_config.json`: Configuration file defining update jobs and execution commands

#### ⚙️ Configuration Example

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

#### 📝 Local Deployment Configuration Example

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

> **Configuration Notes**:
> - `repo_path`: Relative path to Git repository
> - `interval`: Check interval (e.g., "10m" for 10 minutes, "1h" for 1 hour)
> - `post_update`: List of commands to execute after update
> - Docker deployment uses `docker-compose` commands to manage containers
> - Local deployment uses Python from virtual environment and npm commands directly
> - Database and admin configuration automatically written to `backend/.env` file

#### 🚀 Start Auto Update Scheduler

```powershell
cd scripts
python auto_update.py --start --verbose
```

**Parameter Explanation**:
- `--verbose`: Output detailed logs for easier troubleshooting
- `--once`: Execute update check only once (for debugging)
- `--start`: Execute initial update and start service, then continuously monitor (recommended for production)
- `--job <name>`: Run only specified job (can be repeated for multiple jobs)

**Running Methods**:
- **Windows**: Register as scheduled task
- **Linux**: Use systemd or cron for persistent execution
- **Docker**: Run as background process in container

#### 🔧 Custom Deployment Commands

**Docker Deployment Commands**:
- `docker-compose build <service>`: Rebuild specified service
- `docker-compose up -d <service>`: Start/restart specified service
- `docker-compose exec <service> <command>`: Execute command in running container
- `docker-compose restart <service>`: Restart specified service

**Local Deployment Commands**:
- Backend: Execute updates and restarts using Python from virtual environment
- Frontend: Use npm for dependency installation and builds
- PID file management supported for proper service restart

**Configuration Recommendations**:
- For single repository scenarios recommend single Job to avoid duplicate git operations
- `post_update` commands arranged in execution order
- Use object format for commands, supporting `cwd` (working directory) and `cmd` (command)
- Ensure commands complete quickly to avoid blocking scheduler

### Environment Variable Configuration

#### Frontend Environment Variables

Project uses the following environment variable files for configuration:

- **Development Environment**: `frontend/.env.development`
- **Production Environment**: `frontend/.env.production`
- **Configuration Templates**: `frontend/.env.development.example` and `frontend/.env.production.example`

##### Required Environment Variables

- `VITE_API_BASE_URL`: Backend API base address
  - Development: `http://localhost:8002`
  - Production: `https://your-production-domain.com`

##### Configuration Steps

1. Copy example files:
   ```bash
   cp frontend/.env.development.example frontend/.env.development
   cp frontend/.env.production.example frontend/.env.production
   ```

2. Modify `VITE_API_BASE_URL` value based on deployment environment

> **Note**: Actual environment variable files (`.env.development` and `.env.production`) are excluded by `.gitignore` and won't be committed to version control.

#### Backend Environment Variables

##### Required Environment Variables

- `DATABASE_URL`: PostgreSQL database connection URL
  - Format: `postgresql://username:password@host:port/database`
  - Docker environment: `postgresql://postgres:postgres@db:5432/drawsomething`
  - Local development: `postgresql://postgres:postgres@localhost:5432/drawsomething`

##### Optional Environment Variables

- `MODEL_KEY`: Baidu AI Studio access token (optional, for backup AI service)
  - If frontend doesn't have custom AI service configured, this key will be used to call Baidu Wenxin API
  - Get token at: https://aistudio.baidu.com/account/accessToken
- `MODEL_URL`: Custom AI model API endpoint URL (optional)
  - For configuring custom AI service API address
- `MODEL_KEY`: Custom AI model API key (optional)
  - For configuring custom AI service access key
- `MODEL_NAME`: AI model name (optional)
  - Default: `ernie-4.5-vl-28b-a3b`
  - Specify which AI model to use

##### Admin Configuration

- `ADMIN_USER`: Admin username (required, for admin login)
- `ADMIN_PASSWORD`: Admin password (required, for admin login)

> **Admin Configuration Notes**:
> - Edit `backend/.env` file to set admin credentials
> - Example configuration:
>   ```
>   ADMIN_USER=admin
>   ADMIN_PASSWORD=your_secure_password
>   ```
> - Admin can login on `/app/login` page
> - Admin privileges include deleting gallery artwork

## ⚙️ Configuration Details

### 🔴 Important: AI Service Configuration

**This project does NOT include built-in local large model inference**. All AI features require configuring external cloud AI services.

#### Why No Built-in Large Model?

- Even lightweight 256M parameter models have **unacceptable** inference speed on regular CPU (30+ seconds/call)
- User experience cannot be accepted
- **Strongly recommended** to use **cloud service APIs** for better performance and accuracy

#### ✅ Recommended Configuration Plan

**Free Plan: Baidu Paddlepaddle AI Studio** (Recommended)
- Vision Model: `ernie-4.5-vl-28b-a3b` (Required for "Drawing Guess Word" feature)
- Text-to-Image Model: `Stable-Diffusion-XL` (Required for "AI Draw Your Guess" feature)
- Free Quota: 1 million tokens per month
- API Address: `https://aistudio.baidu.com/llm/lmapi/v3`
- Get Token: [Register Baidu AI Studio](https://aistudio.baidu.com/account/accessToken)

**Other Cloud Service Options**
- OpenAI GPT-4V (requires payment)
- Claude Vision (requires payment)
- Any API supporting OpenAI-compatible format

#### 🔧 Configuration Steps

1. **After starting the application, home page auto-detects AI configuration**
   - Shows popup if not configured
   - Click "Configure" button to enter configuration page

2. **Fill information on AI configuration page**
   - Select "Custom Service" tab
   - Enter API URL, API Key, model name
   - Click "Test Vision Model" or "Test Text-to-Image Model" to verify configuration

3. **After successful verification, ready to use**
   - All AI features automatically enabled
   - Configuration auto-saved to local storage

### AI Model Configuration

This project supports flexible AI model configuration:

#### Main Configuration Method (Recommended)
Configure AI service through frontend interface:
- Visit `/app/configAI` page
- Support OpenAI-compatible API interfaces
- Configuration includes: API endpoint, access key, model name, custom prompts

#### Fallback Configuration Method
Set environment variable `MODEL_KEY`:
- **API Endpoint**: `https://aistudio.baidu.com/llm/lmapi/v3`
- **Recommended Model**: `ernie-4.5-vl-28b-a3b` (customizable via `MODEL_NAME` environment variable)
- **Get Key**: https://aistudio.baidu.com/account/accessToken

#### Custom AI Model Configuration
Configure custom AI model via environment variables:
- `MODEL_URL`: Custom model API endpoint
- `MODEL_KEY`: Custom model API key
- `MODEL_NAME`: Custom model name

> **Note**: System prioritizes frontend-configured AI service. If no AI service configured on frontend, auto-fallback to environment variable-configured Baidu Wenxin API.

### Frontend-Backend Integration

- Backend default port: 8002
- Frontend API base address: configured via `.env` file
- Development environment: `VITE_API_BASE_URL=http://localhost:8002`
- Production environment: set actual address in `.env.production`

#### 🔧 Environment Configuration Files

**Development Environment** (`.env`):
```bash
# Required: database connection configuration (Docker environment)
DATABASE_URL=postgresql://postgres:postgres@db:5432/drawsomething

# Optional: set AI API key (if not using frontend configuration)
MODEL_KEY=your_api_key_here

# Optional: custom AI model configuration
MODEL_URL=http://your-custom-model-api.com/v1
MODEL_KEY=your_custom_model_key
MODEL_NAME=your-custom-model-name

# Required: admin configuration
ADMIN_USER=admin
ADMIN_PASSWORD=your_secure_password
```

**Production Environment** (`frontend/.env.production`):
```bash
# Production backend API address
VITE_API_BASE_URL=https://your-production-domain.com/api
```

**Backend Environment** (`backend/.env`):
```bash
# Required: database connection configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/drawsomething

# Optional: AI API key (if not using frontend configuration)
MODEL_KEY=your_production_api_key

# Optional: custom AI model configuration
MODEL_URL=http://your-production-model-api.com/v1
MODEL_KEY=your_production_model_key
MODEL_NAME=your-production-model-name

# Required: admin configuration
ADMIN_USER=admin
ADMIN_PASSWORD=your_secure_password
```

> **Notes**:
> - `frontend/.env.production` file auto-loaded by Vite for production builds
> - `backend/.env` file auto-loaded by python-dotenv for backend configuration
> - For Docker deployment, ensure `frontend/.env.production` and `backend/.env` files in respective directories
> - If using auto-update script, ensure production environment configuration files properly configured

### 🗄️ Database Configuration

Project uses PostgreSQL as database with support for user authentication and session management.

#### Start Database Service

```bash
# Start only database and Adminer
docker-compose up -d db adminer

# Or start only database
docker-compose up -d db
```

#### Adminer Database Management Interface

Visit `http://localhost:8080`, login with following credentials:
- System: PostgreSQL
- Server: `db` (Docker) or `localhost` (local)
- Username: `postgres` | Password: `postgres`

#### Local PostgreSQL Installation (Optional)

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows: Download installer from https://www.postgresql.org/download/windows/
```

Create database:
```sql
CREATE DATABASE drawsomething;
```

#### Database Migrations

Project uses Alembic for database version control and migration management, supporting automatic generation and application of database schema changes.

##### Initialize Database Migrations

When setting up the project for the first time, need to create initial migrations:

```bash
# Enter backend directory
cd backend

# Generate initial migration (auto-detect current models)
alembic revision --autogenerate -m "initial migration"

# Apply migration to database
alembic upgrade head
```

##### Automatic Migration Application

**Project has integrated automatic migration application**, backend auto-applies database migrations on startup without manual operation.

```bash
# Simply start backend normally, migrations will auto-apply
cd backend
python run.py
```

Startup logs will show:
```
Applying database migrations...
Database migration application complete
INFO:     Started server process [...]
```

If migration fails, application continues starting but may encounter database errors.

##### Manual Migration Management

If you need to manually manage migrations:

```bash
# Enter backend directory
cd backend

# Generate new migration file
alembic revision --autogenerate -m "describe changes"

# Manually apply migration
alembic upgrade head

# Check status
alembic status

# View history
alembic history
```

##### Common Commands

```bash
# Most commonly used commands
alembic upgrade head          # Apply all pending migrations (required for production)
alembic current              # View current version
alembic history              # View migration history
alembic downgrade -1         # Rollback one step (use with caution)
alembic revision --autogenerate -m "description"  # Generate new migration file
```

> **Detailed Command Documentation**: For more Alembic commands see [Alembic Official Documentation](https://alembic.sqlalchemy.org/) or follow-up documentation

#### Gallery Database Migration

Project has fully migrated gallery functionality to database, image data stored directly in database without filesystem support.

**Migration Steps:**
```bash
# Enter backend directory
cd backend

# Run migration script (fully migrate gallery.json and image file data to database)
python migrate_gallery.py
```

After migration completes, original `gallery.json` backed up as `gallery.json.backup`, image file data fully imported to database, old image files can be safely deleted.

## 📚 API Documentation

### Core Endpoints

- `POST /api/recognize`: Image recognition endpoint
- `POST /api/rooms/create`: Create game room
- `POST /api/rooms/join`: Join game room
- `POST /api/drawing/submit`: Submit drawing work

Detailed API documentation see routing definitions in backend code.

## 🎮 Gameplay

### Drawing Challenges

1. **Visit mobile home page**: Open `/app/home`
2. **Select drawing challenges**: Enter preset or custom levels
3. **View target word**: System shows keyword to draw
4. **Start drawing**: Use touch screen to create artwork
5. **Submit work**: AI auto-recognizes and judges success
6. **Continue challenge**: Auto-enters next level after success

> **Login Reminder**: Drawing challenges require user login to save progress and use AI recognition. Unlogged users can experience drawing but cannot use AI guessing.

### Free Drawing Mode

1. **Enter free drawing**: Select any word for creation
2. **AI configuration choice**:
   - **Server Call Points**: Use platform AI service (costs points)
   - **Custom AI**: Use personal configured AI service (free)
3. **Submit for recognition**: AI analyzes drawing and provides guess result
4. **Save work**: Excellent works can be published to gallery for sharing

> **Points Notes**: Using server AI service costs call points. Recommended to configure custom AI service first to save points, or recharge timely to maintain sufficient balance.

### Admin Features

#### Admin Login
1. **Visit admin login page**: Open `/app/login`
2. **Enter admin credentials**: Login with configured admin username and password
3. **Gain admin privileges**: Auto-save status after successful login

#### Gallery Management
1. **Visit gallery page**: After admin login, visit `/app/gallery`
2. **View gallery artwork**: Browse all user-uploaded artworks
3. **Delete inappropriate content**: Click delete button (red trash icon) on artwork to remove unsuitable pieces
4. **Real-time updates**: Delete operations take effect immediately, gallery updates in real-time

> **Admin Privilege Notes**:
> - Only logged-in admin account can see delete buttons
> - Delete operations are irreversible, use with caution
> - Admin status persists, auto-recovered on next visit

## 🎯 Function Route Reference

| Route | Function | Description |
|------|----------|-------------|
| `/app/home` | Home Page | Mobile home page with quick navigation |
| `/app/level-set` | Drawing Challenges | Challenge preset and custom levels |
| `/app/level-config` | Level Configuration | Create and manage custom levels |
| `/app/draw` | Free Drawing | Unrestricted free creation mode |
| `/app/challenge-draw` | Challenge Drawing | Drawing page for challenges |
| `/app/introduction` | Instructions | Detailed function introduction and help |
| `/app/configAI` | AI Configuration | Customize AI model settings |
| `/app/login` | Admin Login | Admin account login page |
| `/app/gallery` | Gallery Management | View and manage gallery works (admin privileges) |

## 🤝 Contribution Guide

Welcome to submit Issues and Pull Requests!

### Development Process

1. Fork this project
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add some AmazingFeature'`
4. Push branch: `git push origin feature/AmazingFeature`
5. Submit Pull Request

### Code Style

- Backend: Follow PEP 8 code style
- Frontend: Use ESLint for code checking
- Commit messages: Use clear English descriptions

## 📄 License

This project is licensed under GPL License - see [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you have any questions or suggestions:

- Submit [GitHub Issue](https://github.com/Liyulingyue/DrawSomethingAIPlatform/issues)
- Email project maintainers

---

**Start your AI drawing guessing word journey now!** 🎨🤖
