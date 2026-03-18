# Mizuki 博客 - 服务器部署指南

本文档提供 Mizuki 博客的完整部署方案，包括 Docker 容器化部署和传统 PM2 部署两种方式。

---

## 目录

1. [部署方案对比](#部署方案对比)
2. [方案一：Docker 部署（推荐）](#方案一 docker-部署推荐)
3. [方案二：PM2 部署](#方案二 pm2-部署)
4. [Nginx 反向代理](#nginx-反向代理)
5. [SSL 证书配置](#ssl-证书配置)
6. [常见问题](#常见问题)

---

## 部署方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Docker Compose** | 环境隔离、配置即代码、易迁移 | 需要 Docker 基础 | 推荐：任何支持 Docker 的服务器 |
| **PM2** | 轻量、简单、无需容器化 | 环境依赖需手动安装 | 已有 Node.js 环境的 VPS |

---

## 方案一：Docker 部署（推荐）

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 1GB 可用内存
- 至少 5GB 可用磁盘空间

### 步骤 1：安装 Docker

#### Ubuntu/Debian

```bash
# 卸载旧版本（如有）
sudo apt-get remove docker docker-engine docker.io containerd runc

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl enable docker
sudo systemctl start docker

# 添加当前用户到 docker 组（可选，避免每次都用 sudo）
sudo usermod -aG docker $USER
```

#### CentOS/RHEL

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

### 步骤 2：准备项目

```bash
# 克隆项目（如果是新部署）
git clone https://github.com/your-repo/mizuki-blog.git
cd mizuki-blog

# 复制环境变量文件
cp .env.example .env

# 编辑环境变量（重要！）
nano .env
```

**必须修改的配置：**

```bash
# JWT 密钥（必须修改！）
# 生成方式：openssl rand -hex 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 如果使用 RAG 向量搜索，填入 API 密钥
OPENAI_API_KEY=sk-your-api-key
```

### 步骤 3：一键部署

```bash
# 执行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

部署脚本会自动执行以下步骤：
1. 检查 Docker 环境
2. 构建 Docker 镜像
3. 初始化数据库
4. 启动服务

### 步骤 4：验证部署

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 测试健康检查
curl http://localhost:3000/api/health

# 测试登录 API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mizuki.com","password":"admin123"}'
```

### 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f

# 进入容器
docker compose exec web sh

# 重建镜像
docker compose build --no-cache

# 更新部署
./scripts/deploy.sh update
```

---

## 方案二：PM2 部署

### 前置要求

- Node.js 20+
- pnpm
- PM2

### 步骤 1：安装依赖

```bash
# 安装 Node.js 20（如未安装）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
curl -fsSL https://get.pnpm.io/v6.js | node - add --global

# 安装 PM2
npm install -g pm2
```

### 步骤 2：构建项目

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 构建项目
pnpm build
```

### 步骤 3：配置 PM2

```bash
# 编辑 ecosystem.config.js（如需要）
nano ecosystem.config.js

# 启动服务
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 常用命令

```bash
# 查看状态
pm2 status

# 重启服务
pm2 restart mizuki-blog

# 查看日志
pm2 logs mizuki-blog

# 停止服务
pm2 stop mizuki-blog

# 删除服务
pm2 delete mizuki-blog
```

---

## Nginx 反向代理

### 步骤 1：安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 步骤 2：配置 Nginx

```bash
# 复制配置文件
sudo cp deploy/nginx/mizuki.conf /etc/nginx/sites-available/mizuki

# 编辑配置（修改域名）
sudo nano /etc/nginx/sites-available/mizuki

# 启用配置
sudo ln -s /etc/nginx/sites-available/mizuki /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 步骤 3：配置防火墙

```bash
# UFW（Ubuntu）
sudo ufw allow 'Nginx Full'
sudo ufw status

# Firewalld（CentOS）
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## SSL 证书配置

### 使用 Certbot 自动配置（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 执行 SSL 脚本
chmod +x deploy/ssl-setup.sh
./deploy/ssl-setup.sh your-domain.com
```

### 手动配置

```bash
# 申请证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

Certbot 会自动：
- 申请 SSL 证书
- 配置 Nginx HTTPS
- 设置 HTTP → HTTPS 重定向
- 添加 HSTS 安全头

---

## 常见问题

### 1. Docker 构建失败

**问题：** 内存不足导致构建失败

**解决：**

```bash
# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 2. 端口被占用

**问题：** 3000 端口已被其他服务占用

**解决：** 修改 `docker-compose.yml` 中的端口映射

```yaml
ports:
  - "3001:3000"  # 将外部端口改为 3001
```

### 3. 数据库文件权限问题

**问题：** SQLite 数据库无法写入

**解决：**

```bash
# Docker 卷权限问题，重建卷
docker compose down
docker volume rm mizuki-db
docker compose up -d
```

### 4. 图片上传失败

**问题：** 上传目录没有写入权限

**解决：**

```bash
# 确保上传卷存在
docker volume create mizuki-uploads

# 或者手动创建目录
mkdir -p public/uploads
chmod 755 public/uploads
```

### 5. API 返回 404

**问题：** API 路由无法访问

**解决：** 确保 Astro 配置中代理设置正确，检查 `astro.config.mjs`：

```javascript
vite: {
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}
```

---

## 监控和维护

### 日志管理

```bash
# Docker 日志
docker compose logs -f web

# PM2 日志
pm2 logs mizuki-blog

# Nginx 日志
tail -f /var/log/nginx/mizuki-access.log
tail -f /var/log/nginx/mizuki-error.log
```

### 数据库备份

```bash
# 备份 SQLite 数据库
docker compose exec web cp /app/data/dev.db /tmp/dev.db.backup
docker compose cp web:/tmp/dev.db.backup ./backup/dev.db.$(date +%Y%m%d).db

# 使用 cron 定时备份
0 2 * * * docker compose exec web cp /app/data/dev.db /backup/dev.db.$(date +\%Y\%m\%d).db
```

### 健康检查

```bash
# 手动检查
curl http://localhost:3000/api/health

# 使用脚本检查
#!/bin/bash
if curl -f http://localhost:3000/api/health; then
  echo "服务正常"
else
  echo "服务异常，发送告警..."
  # 发送邮件或调用告警 API
fi
```

---

## 性能优化建议

1. **启用 Redis 缓存**：对于高流量场景，考虑使用 Redis 缓存热点数据
2. **CDN 加速**：将静态资源（图片、字体）托管到 CDN
3. **图片优化**：使用 WebP 格式，启用懒加载
4. **数据库优化**：定期执行 `VACUUM` 优化 SQLite
5. **日志轮转**：配置 logrotate 防止日志文件过大

---

## 技术支持

- 项目仓库：https://github.com/your-repo/mizuki-blog
- 问题反馈：https://github.com/your-repo/mizuki-blog/issues
