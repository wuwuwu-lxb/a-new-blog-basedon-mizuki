# 🌸 Mizuki 个人博客

一个基于 **Astro + Svelte** 的现代化个人博客系统，支持 SSR、用户认证、评论系统、留言板和 AI 搜索等功能。

[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)](https://pnpm.io/)
[![Astro](https://img.shields.io/badge/Astro-6.0.4-orange)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

---

## 📋 目录

1. [快速开始](#-快速开始)
2. [项目架构](#-项目架构)
3. [目录结构](#-目录结构)
4. [配置说明](#-配置说明)
5. [开发指南](#-开发指南)
6. [部署指南](#-部署指南)
7. [常见问题](#-常见问题)

---

## 🚀 快速开始

### 前置要求

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 20.x | [下载地址](https://nodejs.org/) |
| pnpm | >= 9.x | `npm install -g pnpm` |

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd Mizuki
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 初始化数据库

```bash
pnpm init-db
```

此命令会：
- 在 `prisma/` 目录下创建 SQLite 数据库
- 运行数据库迁移
- 初始化管理员账号

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:4321` 查看博客。

---

## 🏗️ 项目架构

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | Astro 6.0.4 | 静态站点生成 + SSR 混合渲染 |
| **UI** | Svelte 5 | 响应式组件 |
| **样式** | TailwindCSS 4 | 原子化 CSS |
| **数据库** | SQLite + Prisma | 轻量级数据持久化 |
| **认证** | JWT | JSON Web Token 鉴权 |
| **搜索** | Pagefind + 向量搜索 | 全文搜索 + AI 语义搜索 |

### 渲染模式

项目采用 **混合渲染模式**：

| 页面类型 | 渲染方式 | 说明 |
|---------|---------|------|
| 首页/列表页 | 预渲染 (Prerender) | 构建时生成静态 HTML |
| 文章详情页 | 预渲染 (Prerender) | 构建时生成静态 HTML |
| 管理后台 | SSR | 运行时动态渲染 |
| API 接口 | SSR | 运行时处理请求 |

### 核心功能模块

```
┌─────────────────────────────────────────────────────────────┐
│                      Mizuki Blog System                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   前端页面  │  │  管理后台   │  │      API 接口       │ │
│  │   Astro     │  │   Svelte    │  │  Astro API Routes  │ │
│  │   静态生成  │  │   SSR      │  │      SSR           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                            │                                │
│                    ┌──────▼──────┐                         │
│                    │   Prisma    │                         │
│                    │    ORM      │                         │
│                    └──────┬──────┘                         │
│                            │                                │
│                    ┌──────▼──────┐                         │
│                    │   SQLite    │                         │
│                    │  本地文件   │                         │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### 数据库模型

项目使用 Prisma ORM，主要数据模型：

| 模型 | 说明 |
|------|------|
| **User** | 用户（管理员/普通用户） |
| **Article** | 文章（标题、内容、标签、分类等） |
| **Comment** | 评论（支持嵌套回复） |
| **Guestbook** | 留言板 |
| **Notification** | 通知 |
| **ArticleView** | 文章浏览量统计 |

---

## 📁 目录结构

```
Mizuki/
├── src/
│   ├── components/        # 前端组件
│   │   ├── admin/         # 管理后台组件
│   │   ├── control/       # 控制类组件（分页、标签等）
│   │   ├── widget/        # 功能组件（搜索、音乐播放器、留言板等）
│   │   └── comment/       # 评论系统组件
│   ├── config/            # 配置文件
│   ├── content/           # 文章内容（Markdown 文件）
│   ├── data/              # 静态数据（友链、时间线等）
│   ├── i18n/              # 国际化文件
│   ├── layouts/           # 页面布局模板
│   ├── lib/               # 工具库
│   │   ├── auth.ts        # JWT 认证
│   │   ├── prisma.ts     # 数据库客户端
│   │   ├── rateLimiter.ts # 限流器
│   │   └── vec-db.ts      # 向量数据库
│   ├── middleware/        # 中间件
│   ├── pages/             # 页面路由
│   │   ├── admin/         # 管理后台页面
│   │   ├── api/           # API 接口
│   │   │   ├── admin/     # 管理后台 API
│   │   │   ├── auth/      # 认证 API
│   │   │   ├── articles/   # 文章 API
│   │   │   └── guestbook/  # 留言板 API
│   │   ├── posts/         # 文章页面
│   │   └── ...
│   ├── styles/            # 全局样式
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── config.ts          # 主配置文件
├── prisma/                # 数据库相关文件
│   ├── schema.prisma      # 数据库模式定义
│   ├── dev.db             # SQLite 数据库文件
│   └── migrations/        # 数据库迁移文件
├── public/                # 静态资源
│   ├── pagefind/          # Pagefind 搜索索引
│   ├── assets/            # 图片、字体等资源
│   └── uploads/           # 用户上传文件
├── scripts/               # 构建脚本
├── .env                   # 环境变量文件
├── astro.config.mjs       # Astro 配置
├── package.json           # 项目配置和脚本
└── README.md              # 项目说明文档
```

---

## ⚙️ 配置说明

### 1. 环境变量 (`.env`)

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

主要配置项：

```env
# 数据库
DATABASE_URL=file:./prisma/dev.db

# JWT 密钥
JWT_SECRET=your_secret_key

# 内容仓库（可选）
ENABLE_CONTENT_SYNC=false
CONTENT_REPO_URL=...

# AI 搜索（可选）
DASHSCOPE_API_KEY=your_api_key

# 哔哩哔哩（可选）
BILI_SESSDATA=...
```

### 2. 站点配置 (`src/config.ts`)

```typescript
export const siteConfig = {
  title: "你的博客名称",
  subtitle: "博客副标题",
  siteURL: "https://your.com",
  lang: "zh-CN",
};

export const profileConfig = {
  name: "你的名字",
  avatar: "/avatar.png",
  bio: "个人简介",
};
```

### 3. 友链配置 (`src/data/friends.ts`)

```typescript
export const friendsData: FriendItem[] = [
  {
    id: 1,
    title: "网站名称",
    imgurl: "/assets/images/avatar.png",
    desc: "网站描述",
    siteurl: "https://example.com",
    tags: ["标签1", "标签2"],
  },
];
```

---

## 📝 开发指南

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器（端口 4321） |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览构建结果 |
| `pnpm init-db` | 初始化数据库 |
| `pnpm new-post <文件名>` | 创建新文章 |
| `pnpm vec-init` | 初始化向量数据库 |
| `pnpm format` | 格式化代码 |

### 创建新文章

```bash
pnpm new-post my-first-post
```

### AI 搜索配置

向量搜索需要配置 DashScope API：

```env
DASHSCOPE_API_KEY=your_api_key
```

初始化向量数据库：

```bash
pnpm vec-init
```

---

## 🚀 部署指南

### 生产构建

```bash
pnpm build
```

构建产物在 `dist/` 目录。

### Docker 部署

```bash
# 构建镜像
docker build -t mizuki .

# 运行容器
docker run -d -p 4321:4321 --env-file .env mizuki
```

### PM2 部署

```bash
# 1. 构建
pnpm build

# 2. 使用 PM2 启动
pm2 start dist/server/entry.mjs --name mizuki
```

---

## 🔧 功能说明

### 用户认证

默认管理员账号：
- 邮箱：`admin@mizuki.com`
- 密码：`admin123`

**请首次登录后立即修改密码！**

### 管理后台

访问 `/admin` 进入管理后台：
- 文章管理：CRUD、分类标签、发布/下架
- 评论管理：审核、删除
- 向量搜索：文章索引管理
- 上传管理：图片管理

### 留言板

- 位置：导航栏 → 关于 → 留言板
- 需要登录后才能留言
- 支持匿名留言
- 仅管理员可删除留言
- 气泡式横向滚动展示

### 评论系统

- 支持嵌套回复
- 支持评论审核
- 支持游客评论（可配置）

### 搜索功能

- **Pagefind**：静态全文搜索（构建后可用）
- **向量搜索**：AI 语义搜索（需配置 API）

### 特色页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 追番页 | `/anime` | 动画观看记录 |
| 友链页 | `/friends` | 友情链接 |
| 时间线 | `/timeline` | 文章归档 |
| 留言板 | `/guestbook` | 访客留言 |
| 相册页 | `/albums` | 图片画廊 |

---

## ❓ 常见问题

### 1. 搜索功能无法使用

搜索功能需要生产构建后才能使用：

```bash
pnpm build
pnpm preview
```

### 2. 向量搜索不工作

1. 检查 `DASHSCOPE_API_KEY` 是否配置
2. 运行 `pnpm vec-init` 初始化向量数据库

### 3. 数据库文件不存在

运行初始化命令：

```bash
pnpm init-db
```

### 4. 端口被占用

修改 `astro.config.mjs` 中的端口配置，或杀死占用端口的进程：

```bash
lsof -ti:4321 | xargs kill -9
```

### 5. 构建失败

尝试以下步骤：

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

---

## 📄 许可证

Apache License 2.0

---

## 🙏 致谢

- 前端模板：[**Mizuki**](https://github.com/matsuzaka-yuki/mizuki)
- 基于 [**Fuwari**](https://github.com/saicaca/fuwari) 二次开发

---

⭐ 如果觉得项目有用，欢迎给个 Star！
