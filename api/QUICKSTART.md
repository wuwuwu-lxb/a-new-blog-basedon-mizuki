# Mizuki API 快速启动指南

## 前置要求

- Node.js 18+
- pnpm 包管理器
- PostgreSQL 数据库

## 快速开始

### 1. 安装依赖

```bash
cd api
pnpm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件，填写以下配置：

```env
# 数据库配置（请根据实际情况修改）
DATABASE_URL="postgresql://username:password@localhost:5432/mizuki_db?schema=public"

# 密钥配置（生产环境请务必修改）
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3001"
JWT_SECRET="your-jwt-secret-key"

# Chat API 配置（可选）
OPENAI_API_KEY=""
CHAT_MODEL="gpt-3.5-turbo"
CHAT_API_URL="https://api.openai.com/v1/chat/completions"
```

### 3. 配置数据库

#### 方式一：使用 Docker 快速启动 PostgreSQL

```bash
docker run -d \
  --name mizuki-db \
  -e POSTGRES_USER=username \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=mizuki_db \
  -p 5432:5432 \
  postgres:15
```

#### 方式二：使用现有 PostgreSQL 实例

修改 `DATABASE_URL` 指向你的数据库。

### 4. 初始化数据库

```bash
# 生成 Prisma 客户端
pnpm db:generate

# 推送 Schema 到数据库（开发环境）
pnpm db:push

# 或者运行迁移（生产环境推荐）
pnpm db:migrate
```

### 5. 启动开发服务器

```bash
pnpm dev
```

API 服务将在 `http://localhost:3001` 启动

---

## 测试 API

### 使用 curl 测试

```bash
# 测试注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "测试用户"
  }'

# 测试登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 使用 Postman/Apifox

导入 API 测试集合（如有）或手动创建请求。

---

## 常见问题

### Q: `pnpm install` 失败

确保使用 pnpm 9+ 版本：
```bash
pnpm --version
# 如果版本过低，重新安装
npm install -g pnpm
```

### Q: 数据库连接失败

1. 检查 PostgreSQL 是否运行
2. 确认 `DATABASE_URL` 配置正确
3. 检查防火墙设置

### Q: Prisma 生成失败

```bash
# 清理缓存
rm -rf node_modules/.prisma
pnpm db:generate
```

---

## 部署

### Vercel 部署

1. 安装 Vercel CLI
```bash
npm i -g vercel
```

2. 部署项目
```bash
cd api
vercel --prod
```

3. 配置环境变量（在 Vercel 控制台）

### Docker 部署

```bash
# 构建镜像
docker build -t mizuki-api .

# 运行容器
docker run -p 3001:3001 --env-file .env mizuki-api
```

### PM2 部署

```bash
# 构建
pnpm build

# 启动
pm2 start npm --name "mizuki-api" -- start

# 查看状态
pm2 status
```

---

## 下一步

1. 配置前端代理指向 API 服务
2. 开发管理面板
3. 配置邮件通知
4. 添加速率限制

详细 API 文档请查看 `README.md`
