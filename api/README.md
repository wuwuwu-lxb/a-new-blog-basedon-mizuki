# Mizuki API 使用文档

## 快速开始

### 1. 安装依赖

```bash
cd api
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/mizuki_db?schema=public"

# NextAuth 配置
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3001"

# JWT 配置
JWT_SECRET="your-jwt-secret-key"

# Chat API 配置
OPENAI_API_KEY="sk-your-api-key"
CHAT_MODEL="gpt-3.5-turbo"
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
pnpm db:generate

# 推送 Schema 到数据库（开发环境）
pnpm db:push

# 或者运行迁移（生产环境）
pnpm db:migrate
```

### 4. 启动开发服务器

```bash
pnpm dev
```

API 服务将在 `http://localhost:3001` 启动

---

## API 接口文档

### 认证接口

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "用户名"
}

Response:
{
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "用户名",
    "role": "USER"
  }
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "用户名",
    "role": "USER",
    "avatar": "https://...",
    "bio": "个人简介"
  }
}
```

#### 获取当前用户
```http
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "用户名",
    "role": "USER",
    "avatar": "https://...",
    "bio": "个人简介",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_count": {
      "articles": 5,
      "comments": 12
    }
  }
}
```

---

### 文章接口

#### 获取文章列表
```http
GET /api/articles?page=1&limit=10&published=true&category=tech&search=keyword

Response:
{
  "articles": [
    {
      "id": 1,
      "title": "文章标题",
      "slug": "article-slug",
      "excerpt": "文章摘要",
      "cover": "https://...",
      "published": true,
      "views": 100,
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "author": {
        "id": 1,
        "name": "作者",
        "avatar": "https://..."
      },
      "categories": [...],
      "tags": [...],
      "_count": {
        "comments": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

#### 获取文章详情
```http
GET /api/articles/{slug}

Response:
{
  "article": {
    "id": 1,
    "title": "文章标题",
    "slug": "article-slug",
    "content": "文章内容...",
    "excerpt": "文章摘要",
    "cover": "https://...",
    "published": true,
    "views": 101,
    "publishedAt": "2024-01-01T00:00:00.000Z",
    "author": {...},
    "categories": [...],
    "tags": [...],
    "comments": [...]
  }
}
```

#### 创建文章（需要管理员）
```http
POST /api/articles
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "文章标题",
  "slug": "article-slug",
  "content": "文章内容",
  "excerpt": "文章摘要",
  "cover": "https://...",
  "published": false,
  "categoryIds": [1, 2],
  "tagIds": [1, 3, 5]
}
```

#### 更新文章
```http
PUT /api/articles/{slug}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "新标题",
  "content": "新内容",
  "published": true
}
```

#### 删除文章
```http
DELETE /api/articles/{slug}
Authorization: Bearer {token}
```

---

### 评论接口

#### 获取评论列表
```http
GET /api/comments?articleId=1&page=1&limit=20

Response:
{
  "comments": [
    {
      "id": 1,
      "content": "评论内容",
      "status": "APPROVED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "author": {...},
      "article": {...},
      "replies": [...]
    }
  ],
  "pagination": {...}
}
```

#### 创建评论
```http
POST /api/comments
Content-Type: application/json

// 已登录用户
{
  "articleId": 1,
  "content": "评论内容",
  "parentId": null
}

// 游客评论
{
  "articleId": 1,
  "content": "评论内容",
  "guestName": "游客",
  "guestEmail": "guest@example.com"
}
```

#### 审核评论（管理员）
```http
PUT /api/comments/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "APPROVED"
}
```

#### 删除评论
```http
DELETE /api/comments/{id}
Authorization: Bearer {token}
```

---

### Chat 接口

#### 发送消息
```http
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "你是一个友好的助手" },
    { "role": "user", "content": "你好" }
  ],
  "sessionId": "optional-session-id"
}

Response:
{
  "content": "你好！有什么可以帮助你的吗？",
  "sessionId": "optional-session-id",
  "messageId": 1
}
```

#### 获取会话列表
```http
GET /api/chat/sessions?page=1&limit=20

Response:
{
  "sessions": [...],
  "pagination": {...}
}
```

#### 获取会话详情
```http
GET /api/chat/sessions/{sessionId}

Response:
{
  "session": {
    "id": 1,
    "sessionId": "...",
    "title": "对话标题",
    "messages": [
      {
        "id": 1,
        "role": "USER",
        "content": "你好",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "role": "ASSISTANT",
        "content": "你好！有什么可以帮助你的吗？",
        "createdAt": "2024-01-01T00:00:01.000Z"
      }
    ]
  }
}
```

#### 删除会话
```http
DELETE /api/chat/sessions/{sessionId}
Authorization: Bearer {token}
```

---

## 错误响应

所有错误响应遵循统一格式：

```json
{
  "error": "错误信息",
  "details": [
    {
      "field": "字段名",
      "message": "详细错误信息"
    }
  ]
}
```

常见 HTTP 状态码：
- `200` - 请求成功
- `201` - 创建成功
- `400` - 参数验证失败
- `401` - 未授权/Token 无效
- `403` - 权限不足
- `404` - 资源不存在
- `405` - 请求方法不允许
- `500` - 服务器错误
- `503` - 服务不可用

---

## 数据库 Schema

主要数据表：
- `users` - 用户表
- `articles` - 文章表
- `categories` - 分类表
- `tags` - 标签表
- `comments` - 评论表
- `chat_sessions` - 聊天会话表
- `messages` - 聊天消息表

详细 Schema 请查看 `prisma/schema.prisma`

---

## 开发指南

### 添加新的 API 路由

1. 在 `src/routes/` 创建路由处理函数
2. 在 `src/pages/api/` 创建 API 入口
3. 使用 `withAuth` 中间件处理认证

### 权限说明

- `USER` - 普通用户，可以创建评论、管理自己的内容
- `ADMIN` - 管理员，可以管理所有内容

### 安全建议

1. 生产环境务必更改 `NEXTAUTH_SECRET` 和 `JWT_SECRET`
2. 使用强密码策略
3. 启用 HTTPS
4. 配置 CORS 白名单
5. 添加速率限制

---

## 部署

### Vercel 部署

```bash
vercel deploy --prod
```

### Docker 部署

```bash
docker build -t mizuki-api .
docker run -p 3001:3001 --env-file .env mizuki-api
```

### PM2 部署

```bash
pnpm build
pm2 start npm --name "mizuki-api" -- start
```

---

## 许可证

MIT License
