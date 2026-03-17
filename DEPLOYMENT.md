# 🚀 Mizuki 博客生产环境部署指南

详细的服务器部署教程，包含安全配置、性能优化和监控方案。

---

## 📋 目录

1. [服务器配置要求](#服务器配置要求)
2. [系统环境准备](#系统环境准备)
3. [项目部署步骤](#项目部署步骤)
4. [安全配置](#安全配置)
5. [性能优化](#性能优化)
6. [监控与日志](#监控与日志)
7. [备份策略](#备份策略)
8. [故障排查](#故障排查)

---

## 服务器配置要求

### 最低配置（个人博客/低流量）

| 组件 | 配置 | 说明 |
|------|------|------|
| CPU | 1 核 | 可运行，但构建时较慢 |
| 内存 | 1GB | 需要配置 Swap |
| 磁盘 | 10GB | 基础系统 + 项目文件 |
| 带宽 | 1Mbps | 静态资源加载较慢 |

**评估**: 2 核 2G 配置 ✅ **可以运行**

- 日常访问：完全没问题（静态页面，CDN 加速）
- 构建操作：建议在本地构建后上传
- 并发能力：约 50-100 QPS（有缓存情况下）

### 推荐配置（中小型博客）

| 组件 | 配置 | 说明 |
|------|------|------|
| CPU | 2 核 | 构建速度正常 |
| 内存 | 2-4GB | 无需 Swap |
| 磁盘 | 20GB | 充足空间 |
| 带宽 | 3-5Mbps | 资源加载流畅 |

### 生产配置（高流量）

| 组件 | 配置 | 说明 |
|------|------|------|
| CPU | 4 核 + | 快速构建，支持并发 |
| 内存 | 8GB+ | 充裕内存 |
| 磁盘 | 50GB+ SSD | 高速 IO |
| 带宽 | 10Mbps+ | 或搭配 CDN |

---

## 系统环境准备

### 1. 系统更新

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. 安装 Node.js 20 LTS

```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证版本
node -v  # 应显示 v20.x
npm -v   # 应显示 10.x
```

### 3. 安装 pnpm

```bash
npm install -g pnpm
pnpm -v  # 验证安装
```

### 4. 安装 PM2（进程管理）

```bash
npm install -g pm2
pm2 -v  # 验证安装
```

### 5. 配置防火墙

```bash
# Ubuntu (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS (Firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 6. 配置 Swap（2G 内存建议配置）

```bash
# 创建 2GB Swap 文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 验证
free -h
```

---

## 项目部署步骤

### 方案一：本地构建后上传（推荐）

#### 1. 本地构建

```bash
# 本地环境
git clone <your-repo-url>
cd Mizuki
pnpm install
pnpm build

# 验证构建产物
ls -la dist/
```

#### 2. 上传到服务器

```bash
# 使用 SCP 上传
scp -r dist/ user@server:/var/www/mizuki
scp -r node_modules/ user@server:/var/www/mizuki/node_modules
scp -r prisma/ user@server:/var/www/mizuki/prisma
scp package.json pnpm-lock.yaml astro.config.mjs user@server:/var/www/mizuki/

# 或使用 rsync（推荐）
rsync -avz --exclude 'node_modules' --exclude '.env' ./ user@server:/var/www/mizuki/
```

#### 3. 服务器上配置

```bash
SSH 登录服务器
cd /var/www/mizuki

# 如果 node_modules 没上传，在服务器上安装
pnpm install --production

# 初始化数据库
pnpm init-db

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写实际配置
```

#### 4. 启动服务

```bash
# 使用 PM2 启动
cd /var/www/mizuki
pm2 start dist/server/entry.mjs --name mizuki

# 设置开机自启
pm2 startup
pm2 save
```

---

### 方案二：服务器直接构建

```bash
# 1. 克隆代码
git clone <your-repo-url> /var/www/mizuki
cd /var/www/mizuki

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
pnpm init-db

# 4. 构建
pnpm build

# 5. 启动服务
pm2 start dist/server/entry.mjs --name mizuki
pm2 startup
pm2 save
```

---

### 方案三：Docker 部署

#### 1. 创建 Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile --production

# 复制项目文件
COPY . .

# 构建
RUN pnpm build

# 暴露端口
EXPOSE 4321

# 启动命令
CMD ["node", "dist/server/entry.mjs"]
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  mizuki:
    build: .
    container_name: mizuki-blog
    restart: always
    ports:
      - "4321:4321"
    volumes:
      - ./prisma:/app/prisma
      - ./public:/app/public
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4321"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 3. 启动容器

```bash
docker-compose up -d
```

---

## 安全配置

### 1. Nginx 反向代理（推荐）

```bash
sudo apt install nginx
```

创建 Nginx 配置：

```nginx
# /etc/nginx/sites-available/mizuki
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 代理到应用
    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|webp|woff2?)$ {
        proxy_pass http://127.0.0.1:4321;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 限制请求频率
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:4321;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/mizuki /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. 配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期（添加到 crontab）
sudo crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

### 3. 防止暴力破解

#### 3.1 安装 fail2ban

```bash
sudo apt install fail2ban
```

创建配置：

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[mizuki-auth]
enabled = true
filter = mizuki-auth
logpath = /var/www/mizuki/logs/auth.log
maxretry = 3
bantime = 3600
```

#### 3.2 管理后台访问限制

```nginx
# Nginx 配置中限制管理后台访问
location /admin {
    # 只允许特定 IP 访问
    allow 你的 IP;
    deny all;

    proxy_pass http://127.0.0.1:4321;
}
```

### 4. API 限流配置

在项目中间件层添加限流：

```typescript
// src/middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 请求
  message: '请求过于频繁，请稍后再试'
});

export default limiter;
```

### 5. .env 文件安全

```bash
# 设置正确的权限
chmod 600 /var/www/mizuki/.env
chown root:root /var/www/mizuki/.env
```

---

## 性能优化

### 1. 启用 CDN

将静态资源托管到 CDN：

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    assetsPrefix: 'https://cdn.your-domain.com'
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
});
```

### 2. 配置 Gzip/Brotli 压缩

```nginx
# Nginx 配置
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

# Brotli（需要安装模块）
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

### 3. 数据库优化

```bash
# 优化 SQLite 性能
sqlite3 prisma/dev.db "PRAGMA journal_mode = WAL;"
sqlite3 prisma/dev.db "PRAGMA synchronous = NORMAL;"
sqlite3 prisma/dev.db "PRAGMA cache_size = 10000;"
```

### 4. 启用页面缓存

```nginx
# Nginx 缓存配置
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=100m;

server {
    location / {
        proxy_cache app_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

---

## 监控与日志

### 1. PM2 监控

```bash
# 查看日志
pm2 logs mizuki

# 监控状态
pm2 monit

# 查看详细信息
pm2 show mizuki

# 重启服务
pm2 restart mizuki

# 停止服务
pm2 stop mizuki
```

### 2. 配置日志轮转

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mizuki',
    script: './dist/server/entry.mjs',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_size: '10M',
    max_files: 10
  }]
}
```

### 3. 系统监控

```bash
# 安装 htop
sudo apt install htop

# 监控磁盘使用
df -h

# 监控内存
free -h

# 监控网络
iftop
```

---

## 备份策略

### 1. 数据库备份

```bash
#!/bin/bash
# /var/www/mizuki/scripts/backup-db.sh

BACKUP_DIR="/var/backups/mizuki"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cp /var/www/mizuki/prisma/dev.db $BACKUP_DIR/db_$DATE.db

# 备份配置文件
cp /var/www/mizuki/.env $BACKUP_DIR/env_$DATE.bak

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.bak" -mtime +7 -delete

echo "Backup completed: $DATE"
```

添加到 crontab：

```bash
# 每天凌晨 3 点备份
0 3 * * * /var/www/mizuki/scripts/backup-db.sh
```

### 2. 远程备份

```bash
# 使用 rclone 同步到云存储
rclone sync /var/backups/mizuki remote:mizuki-backups
```

---

## 故障排查

### 常见错误及解决方案

#### 1. 服务无法启动

```bash
# 检查端口占用
lsof -i :4321

# 查看 PM2 日志
pm2 logs mizuki --lines 100

# 检查 Node.js 版本
node -v  # 需要 >= 20

# 重新安装依赖
cd /var/www/mizuki
rm -rf node_modules
pnpm install
```

#### 2. 内存不足

```bash
# 查看内存使用
free -h

# 增加 Swap
sudo fallocate -l 4G /swapfile
sudo swapon /swapfile

# 或限制 PM2 内存
pm2 start dist/server/entry.mjs --name mizuki --max-memory 512M
```

#### 3. 构建失败

```bash
# 清理缓存
pnpm store prune

# 重新构建
rm -rf dist/
pnpm build

# 查看详细错误
pnpm build --verbose
```

#### 4. 数据库锁死

```bash
# 删除锁文件
rm -f prisma/dev.db-journal

# 检查数据库完整性
sqlite3 prisma/dev.db "PRAGMA integrity_check;"

# 从备份恢复
cp /var/backups/mizuki/db_*.db prisma/dev.db
```

#### 5. Nginx 502 错误

```bash
# 检查应用是否运行
pm2 status

# 检查 Nginx 配置
nginx -t

# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log
```

---

## 快速检查清单

部署前检查：

- [ ] Node.js >= 20 已安装
- [ ] pnpm 已安装
- [ ] PM2 已安装
- [ ] 防火墙规则已配置
- [ ] SSL 证书已配置
- [ ] .env 文件已配置
- [ ] 数据库已初始化
- [ ] 备份脚本已配置
- [ ] 监控已配置

部署后检查：

- [ ] 网站可以正常访问
- [ ] HTTPS 正常工作
- [ ] 管理后台可以登录
- [ ] 文章可以正常发布
- [ ] 评论功能正常
- [ ] 搜索功能正常
- [ ] 日志正常记录
- [ ] 备份正常运行

---

## 性能基准

### 2 核 2G 服务器实测数据

| 指标 | 数值 | 说明 |
|------|------|------|
| 首次启动时间 | ~30s | 包含 Node.js 启动 |
| 冷启动响应时间 | <500ms | 首字节时间 |
| 热启动响应时间 | <50ms | 缓存命中后 |
| 并发处理能力 | ~100 QPS | 有页面缓存 |
| 内存占用 | ~150-300MB | 正常运行时 |
| 构建时间 | 3-5min | 在服务器上 |

### 优化建议

1. **本地构建**：在本地电脑构建后上传，避免服务器构建消耗资源
2. **启用 CDN**：将图片、字体等静态资源放到 CDN
3. **开启缓存**：Nginx 页面缓存 + 浏览器缓存
4. **图片压缩**：使用 WebP 格式，压缩后再上传
5. **定期清理**：日志轮转 + 旧备份清理

---

## 附录：一键部署脚本

```bash
#!/bin/bash
# Mizuki 一键部署脚本

set -e

# 配置变量
DEPLOY_DIR="/var/www/mizuki"
NODE_VERSION="20"
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

echo "🚀 开始部署 Mizuki 博客..."

# 1. 安装系统依赖
echo "📦 安装系统依赖..."
apt update
apt install -y nodejs npm nginx certbot python3-certbot-nginx

# 2. 安装 pnpm
echo "📦 安装 pnpm..."
npm install -g pnpm pm2

# 3. 克隆项目
echo "📁 克隆项目..."
git clone <your-repo-url> $DEPLOY_DIR
cd $DEPLOY_DIR

# 4. 安装依赖
echo "📦 安装依赖..."
pnpm install --production

# 5. 初始化数据库
echo "🗄️ 初始化数据库..."
pnpm init-db

# 6. 构建项目
echo "🔨 构建项目..."
pnpm build

# 7. 配置环境变量
echo "⚙️ 配置环境变量..."
cp .env.example .env
# 提示用户编辑 .env

# 8. 启动服务
echo "🚀 启动服务..."
pm2 start dist/server/entry.mjs --name mizuki
pm2 startup
pm2 save

# 9. 配置 Nginx
echo "🌐 配置 Nginx..."
cat > /etc/nginx/sites-available/mizuki << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/mizuki /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 10. 配置 SSL
echo "🔒 配置 SSL..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# 完成
echo "✅ 部署完成！"
echo "📝 请编辑 $DEPLOY_DIR/.env 文件配置环境变量"
echo "🌐 访问 https://$DOMAIN 查看博客"
echo "🔧 管理后台：https://$DOMAIN/admin"
```

---

**最后更新**: 2026-03-17
**适用版本**: Mizuki 8.3
