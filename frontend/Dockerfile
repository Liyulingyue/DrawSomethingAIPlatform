# 构建阶段
FROM node:20 as builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 运行阶段
FROM nginx:alpine

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制编译产物到 nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口 5175
EXPOSE 5175

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
