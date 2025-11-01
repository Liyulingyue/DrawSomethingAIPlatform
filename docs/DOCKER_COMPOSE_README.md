# Docker Compose 配置说明

本项目使用多个 Docker Compose 配置文件来支持不同的部署环境：

## 配置文件说明

### 1. `docker-compose.yml` (生产环境)
- 默认配置文件，适用于生产部署
- 数据库不暴露端口，安全性更高
- 不包含开发工具（如 Adminer）
- 后端使用构建的镜像（不挂载源代码）
- 前端使用开发服务器（生产环境建议使用 nginx 服务构建的静态文件）

### 2. `docker-compose.dev.yml` (开发环境)
- 开发专用配置
- 支持源代码热重载
- 数据库端口暴露，便于直接连接
- 包含 Adminer 数据库管理工具
- 开发环境配置（如更多调用点、更长会话超时）

### 3. `docker-compose.android.yml` (Android 构建)
- 专门用于构建 Android APK
- 包含 Android 构建服务

## 使用方法

### 开发环境
```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up

# 后台运行
docker-compose -f docker-compose.dev.yml up -d

# 停止开发环境
docker-compose -f docker-compose.dev.yml down
```

### 生产环境
```bash
# 启动生产环境
docker-compose up

# 后台运行
docker-compose up -d

# 停止生产环境
docker-compose down
```

### Android 构建
```bash
# 构建 debug APK
docker-compose -f docker-compose.android.yml up android-builder

# 构建 release APK
docker-compose -f docker-compose.android.yml up android-builder-release
```

## 环境差异

| 功能 | 开发环境 | 生产环境 |
|------|----------|----------|
| 数据库端口 | 暴露 (5432) | 不暴露 |
| Adminer | 启用 (8080) | 禁用 |
| 源代码挂载 | 是 | 否 |
| 热重载 | 支持 | 不支持 |
| 调试配置 | 启用 | 禁用 |
| 调用点赠送 | 100 | 20 |

## 生产环境优化建议

### 前端部署优化
当前生产环境的 `docker-compose.yml` 使用开发服务器运行前端。对于生产环境，建议：

1. **构建静态文件**：
   ```bash
   cd frontend
   npm run build
   ```

2. **使用 nginx 服务静态文件**（推荐）：
   ```yaml
   frontend:
     image: nginx:alpine
     ports:
       - "80:80"
     volumes:
       - ./frontend/dist:/usr/share/nginx/html
       - ./nginx.conf:/etc/nginx/nginx.conf
     restart: unless-stopped
   ```

### 安全加固
- 设置强密码环境变量
- 使用 secrets 文件存储敏感信息
- 定期更新基础镜像

### 性能优化
- 使用多阶段构建减小镜像大小
- 配置适当的资源限制
- 启用日志轮转