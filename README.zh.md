# 🌸 Mizuki 个人博客

一个基于 **Astro + Svelte** 的现代化个人博客系统，集成用户认证、评论系统、管理后台等功能。

[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)](https://pnpm.io/)
[![Astro](https://img.shields.io/badge/Astro-6.0.4-orange)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

[📖 English Documentation](README.md)

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
- 初始化必要的表结构（用户、文章、评论等）

> **注意**：数据库文件已添加到 `.gitignore`，不会被提交到 Git 仓库。

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
| **搜索** | Pagefind | 静态全文搜索 |

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
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  博客前端   │  │  管理后台   │  │   API 服务层          │  │
│  │  Astro SSR  │  │  Svelte 5   │  │  Astro API Routes   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │   Prisma    │                          │
│                    │    ORM      │                          │
│                    └──────┬──────┘                          │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │   SQLite    │                          │
│                    │   Database  │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构

```
Mizuki/
├── src/
│   ├── components/        # 前端组件
│   │   ├── admin/         # 管理后台组件
│   │   ├── control/       # 控制类组件（分页、标签等）
│   │   ├── misc/          # 通用组件
│   │   ├── widget/        # 功能组件（搜索、音乐播放器等）
│   │   └── comment/       # 评论系统组件
│   ├── config/            # 配置文件
│   ├── content/           # 文章内容（Markdown 文件）
│   ├── i18n/              # 国际化文件
│   ├── layouts/           # 页面布局模板
│   ├── lib/               # 工具库
│   ├── middleware/        # 中间件
│   ├── pages/             # 页面路由
│   │   ├── admin/         # 管理后台页面
│   │   ├── api/           # API 接口
│   │   ├── auth/          # 认证相关页面
│   │   └── posts/         # 文章页面
│   ├── styles/            # 全局样式
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── config.ts          # 主配置文件
├── prisma/                # 数据库相关文件
│   ├── schema.prisma      # 数据库模式定义
│   └── dev.db             # SQLite 数据库文件（已忽略）
├── public/                # 静态资源
│   ├── pagefind/          # Pagefind 搜索索引（构建生成）
│   └── assets/            # 图片、字体等资源
├── scripts/               # 构建脚本
├── docs/                  # 项目文档
├── dist/                  # 构建输出目录（已忽略）
├── node_modules/          # 依赖包（已忽略）
├── .env                   # 环境变量文件（已忽略）
├── .env.example           # 环境变量示例
├── astro.config.mjs       # Astro 配置
├── package.json           # 项目配置和脚本
├── pnpm-lock.yaml         # 依赖锁定文件
├── tsconfig.json          # TypeScript 配置
└── README.md              # 项目说明文档
```

---

## ⚙️ 配置说明

### 1. 站点配置 (`src/config.ts`)

```typescript
export const siteConfig = {
  title: "你的博客名称",        // 站点标题
  subtitle: "博客副标题",       // 副标题
  siteURL: "https://your.com", // 站点 URL（SEO 使用）
  lang: "zh-CN",              // 语言
  // ... 更多配置
};

export const profileConfig = {
  name: "你的名字",           // 作者名
  avatar: "/avatar.png",      // 头像路径
  bio: "个人简介",            // 简介
};
```

### 2. 环境变量 (`.env`)

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

主要配置项：

```env
# 内容仓库配置（可选）
ENABLE_CONTENT_SYNC=false      # 是否启用内容分离
CONTENT_REPO_URL=...           # 内容仓库 Git 地址

# IndexNow SEO 配置（可选）
INDEXNOW_KEY=your_key          # IndexNow API 密钥
INDEXNOW_HOST=your.com         # 网站域名

# Bilibili 配置（可选）
BILI_SESSDATA=your_sessdata    # 获取观看进度用
```

### 3. 数据库配置 (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
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
| `pnpm format` | 格式化代码 |
| `pnpm lint` | ESLint 检查 |

### 创建新文章

```bash
pnpm new-post my-first-post
```

会在 `src/content/posts/my-first-post/` 目录下创建文章模板：

```yaml
---
title: 文章标题
published: 2024-01-01
updated: 2024-01-02
description: 文章描述
tags: [标签 1, 标签 2]
category: 分类名
image: ./cover.webp      # 封面图
draft: false             # 是否为草稿
encrypted: false         # 是否加密
---

文章正文（支持 Markdown）
```

### 文章加密

在文章 Frontmatter 中设置：

```yaml
---
title: 加密文章
encrypted: true
password: your_password
---
```

### 本地图片引用

```markdown
![图片描述](./image.png)
```

图片应放在文章同目录下。

---

## 🚀 部署指南

### 生产构建

```bash
# 1. 构建
pnpm build

# 2. 预览
pnpm preview
```

构建产物在 `dist/` 目录。

### Vercel 部署

1. 安装 Vercel CLI：
```bash
npm i -g vercel
```

2. 部署：
```bash
vercel
```

3. 生产发布：
```bash
vercel --prod
```

### Docker 部署

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制文件
COPY . .

# 安装依赖
RUN pnpm install

# 构建
RUN pnpm build

EXPOSE 4321

CMD ["pnpm", "preview"]
```

### 服务器部署

```bash
# 1. 构建本地
pnpm build

# 2. 上传 dist 目录到服务器
scp -r dist/* user@server:/var/www/mizuki

# 3. 启动服务（使用 PM2 或 systemd）
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
- 文章管理：CRUD、分类标签
- 评论管理：审核、删除
- 用户管理：权限设置

### 评论系统

- 支持嵌套回复
- 支持评论审核
- 支持游客评论（可配置）

### 搜索功能

使用 Pagefind 静态搜索：
- 全文索引
- 高亮显示
- 离线搜索

**注意**：搜索功能仅在生产构建后可用。

### 特色页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 追番页 | `/anime` | 动画观看记录 |
| 友链页 | `/friends` | 友情链接 |
| 时间线 | `/timeline` | 文章归档 |
| 相册页 | `/albums` | 图片画廊 |

---

## ❓ 常见问题

### 1. 搜索功能无法使用

搜索功能需要生产构建后才能使用：

```bash
pnpm build
pnpm preview
```

### 2. 数据库文件不存在

运行初始化命令：

```bash
pnpm init-db
```

### 3. 端口被占用

修改 `astro.config.mjs` 中的端口配置，或杀死占用端口的进程：

```bash
# 杀死占用 4321 端口的进程
lsof -ti:4321 | xargs kill -9
```

### 4. 文章修改后不更新

Astro 开发服务器会自动监听文件变化。如无生效：
1. 重启开发服务器
2. 清除 `.astro/` 缓存目录

### 5. 构建失败

尝试以下步骤：
1. 清除依赖：`rm -rf node_modules pnpm-lock.yaml`
2. 重新安装：`pnpm install`
3. 清理缓存：`pnpm store prune`
4. 重新构建：`pnpm build`

---

## 📄 许可证

Apache License 2.0

---

## 🙏 致谢

- 前端模板：[**Mizuki**](https://github.com/matsuzaka-yuki/Mizuki)
- 基于 [**Fuwari**](https://github.com/saicaca/fuwari) 二次开发

---

⭐ 如果觉得项目有用，欢迎给个 Star！
