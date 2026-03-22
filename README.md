# 🌸 Mizuki 博客系统

> 一个基于 Astro 6 + Svelte 5 + Prisma + SQLite 的现代化个人博客系统
> 采用全数据库存储方案，部署简单，支持 SSR 混合渲染

[![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)
[![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)](https://pnpm.io/)
[![Astro](https://img.shields.io/badge/Astro-6.0.4-orange)](https://astro.build/)
[![Svelte](https://img.shields.io/badge/Svelte-5-orange)](https://svelte.dev/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

---

## ⚡ 快速开始

### 环境要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 22.x | [下载地址](https://nodejs.org/) |
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

该命令会：
- 创建 SQLite 数据库文件 (`prisma/dev.db`)
- 运行 Prisma 迁移
- 初始化管理员账号（邮箱：`admin@mizuki.com`，密码：`admin123`）

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:4321` 查看博客。

---

## 📦 项目架构

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | Astro 6.0.4 | 静态生成 + SSR 混合模式 |
| **UI 组件** | Svelte 5 | 响应式组件 |
| **样式** | TailwindCSS 4 | 原子化 CSS |
| **数据库** | SQLite + Prisma | 单文件数据库，全数据存储 |
| **认证** | JWT | Cookie 方式存储 Token |
| **搜索** | Pagefind + 向量搜索 | 全文搜索 + AI 语义搜索 |

### 核心特性

#### 1. 全数据库存储
- **文章内容**: 存储于 `Article` 表
- **图片资源**: Base64 编码存入 `Article.images` 字段
- **封面图片**: Base64 编码存入 `Article.cover` 字段
- **优势**:
  - 部署简单，只需一个数据库文件
  - 删除文章时图片自动清理
  - 无需配置文件存储权限

#### 2. 图片占位符优化
编辑器中使用占位符格式显示图片，避免 Base64 编码过长影响编辑体验：

```
编辑时显示：{{img_1}}  {{img_2}}
保存时替换：![img_1](data:image/png;base64...)
```

#### 3. 混合渲染模式
| 页面类型 | 渲染方式 | 说明 |
|---------|---------|------|
| 首页/列表页 | 预渲染 | 构建时生成静态 HTML |
| 文章详情页 | SSR | 运行时动态渲染，支持实时浏览量 |
| 管理后台 | SSR | 运行时动态渲染 |

---

## 📁 目录结构

```
Mizuki/
├── src/
│   ├── components/        # 前端组件
│   │   ├── admin/         # 管理后台组件（文章编辑、图片管理）
│   │   ├── control/       # 控制类组件（分页、标签）
│   │   ├── widget/        # 功能组件（搜索、播放器、留言板）
│   │   └── comment/       # 评论系统
│   ├── config/            # 配置文件
│   ├── i18n/              # 国际化
│   ├── layouts/           # 页面布局
│   ├── lib/               # 工具库
│   │   ├── prisma.ts      # 数据库客户端
│   │   └── auth.ts        # JWT 认证
│   ├── middleware/        # 中间件
│   ├── pages/             # 页面路由
│   │   ├── admin/         # 管理后台
│   │   ├── api/           # API 接口
│   │   └── posts/         # 文章详情
│   ├── styles/            # 全局样式
│   └── utils/             # 工具函数
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   └── dev.db             # SQLite 数据库文件
├── public/                # 静态资源
│   └── pagefind/          # Pagefind 搜索索引
└── scripts/               # 构建脚本
```

---

## ⚙️ 配置文件

### 1. 环境变量 (.env)

```bash
# 数据库配置
DATABASE_URL=file:./prisma/dev.db

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=your_secret_key_here

# AI 搜索（可选）
DASHSCOPE_API_KEY=your_api_key
```

### 2. 站点配置 (src/config.ts)

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

---

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器（端口 4321） |
| `pnpm build` | 生产构建 |
| `pnpm preview` | 预览构建结果 |
| `pnpm init-db` | 初始化数据库 |
| `pnpm vec-init` | 初始化向量数据库（AI 搜索） |

---

## 🚀 部署指南

### 方式一：Node.js 直接运行

```bash
# 1. 构建
pnpm build

# 2. 启动服务
node dist/server/entry.mjs
```

### 方式二：PM2

```bash
# 1. 构建
pnpm build

# 2. 使用 PM2 启动
pm2 start dist/server/entry.mjs --name mizuki

# 3. 设置开机自启
pm2 startup
pm2 save
```

### 方式三：Docker

```bash
# 构建镜像
docker build -t mizuki .

# 运行容器
docker run -d -p 4321:4321 --env-file .env mizuki
```

---

## 🔐 管理后台

### 访问管理后台
访问 `http://localhost:4321/admin` 进入管理后台

### 默认管理员账号
- **邮箱**: `admin@mizuki.com`
- **密码**: `admin123`

**⚠️ 请首次登录后立即修改密码！**

### 功能模块
| 模块 | 功能 |
|------|------|
| **文章管理** | 创建/编辑/删除文章，支持 Markdown、图片上传、图片管理 |
| **向量搜索** | AI 语义搜索配置和索引管理 |
| **用户验证** | 访客验证页面配置 |

---

## 📝 文章管理

### 新建文章
1. 访问 `/admin/articles/new`
2. 填写基础信息：标题、Slug、分类、标签、发布日期、浏览量
3. 上传封面图（可选）
4. 编写 Markdown 内容
5. 点击 `📷 插入图片` 上传并插入文中图片
6. 点击「创建文章」

### 编辑文章
1. 访问 `/admin/articles` 进入文章列表
2. 点击文章进入编辑页面
3. 可修改所有字段，包括高级设置（加密、置顶、许可证等）
4. 图片管理器：查看、删除、插入已上传图片

### 图片格式说明
- **编辑时显示**: `{{img_1}}`、`{{img_2}}`（占位符，清爽易读）
- **保存后存储**: `![img_1](data:image/png;base64...)`（完整 Base64）
- **页面渲染**: 自动解析为 `<img>` 标签

---

## 💬 评论系统

评论与文章通过 `slug` 绑定：
- 每篇文章有独立的评论线程
- 支持嵌套回复
- 支持评论审核
- 评论数据存入数据库 `Comment` 表

---

## 🔍 搜索功能

### Pagefind 全文搜索
- 构建时自动生成索引
- 支持中文分词
- 索引文件位于 `public/pagefind/`

### 向量搜索 (AI 语义搜索)
需要配置 DashScope API：

```bash
# 1. 配置环境变量
export DASHSCOPE_API_KEY=your_api_key

# 2. 初始化向量数据库
pnpm vec-init
```

---

## ❓ 常见问题

### 1. 端口被占用
```bash
# 杀死占用 4321 端口的进程
lsof -ti:4321 | xargs kill -9

# 或者直接修改 astro.config.mjs 中的端口
```

### 2. 搜索功能不可用
搜索功能需要生产构建后才能使用：
```bash
pnpm build
pnpm preview
```

### 3. 数据库文件不存在
```bash
pnpm init-db
```

### 4. 构建失败
```bash
# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

---

## 📄 许可证

Apache License 2.0

---

## 🙏 致谢

- 前端模板基于 [**Mizuki**](https://github.com/matsuzaka-yuki/mizuki)
- 灵感来源于 [**Fuwari**](https://github.com/saicaca/fuwari)

---

⭐ **如果这个项目对你有帮助，欢迎给一个 Star！**
