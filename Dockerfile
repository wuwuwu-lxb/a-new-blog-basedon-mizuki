# Mizuki 博客 - 生产环境 Dockerfile
# 多阶段构建：Astro 前端 + Next.js API

# ============================================
# 阶段 1: 基础环境 - 安装 pnpm
# ============================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ============================================
# 阶段 2: 构建 Astro 前端
# ============================================
FROM base AS astro-builder
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml（利用 Docker 层缓存）
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies，因为需要构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建 Astro（包含 prebuild 钩子：sync-content）
RUN pnpm build

# ============================================
# 阶段 3: 构建 Next.js API（可选，如果 API 集成在主应用中）
# ============================================
FROM base AS api-builder
WORKDIR /app/api

# 复制 API 的 package.json
COPY api/package.json api/pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制 API 源代码
COPY api/ .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 Next.js
RUN pnpm build

# ============================================
# 阶段 4: 生产运行环境
# ============================================
FROM base AS runner
WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache libc6-compat sqlite

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# ============================================
# 复制构建产物
# ============================================

# 复制 Astro 构建产物和 node_modules
COPY --from=astro-builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=astro-builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=astro-builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=astro-builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=astro-builder --chown=nodejs:nodejs /app/scripts/sync-content.js ./scripts/sync-content.js

# 复制 Astro 配置和源码（需要 src/pages/api 等）
COPY --from=astro-builder --chown=nodejs:nodejs /app/astro.config.mjs ./
COPY --from=astro-builder --chown=nodejs:nodejs /app/svelte.config.js ./
COPY --from=astro-builder --chown=nodejs:nodejs /app/tailwind.config.js ./
COPY --from=astro-builder --chown=nodejs:nodejs /app/tsconfig.json ./
COPY --from=astro-builder --chown=nodejs:nodejs /app/src ./src
COPY --from=astro-builder --chown=nodejs:nodejs /app/public ./public

# 创建数据目录
RUN mkdir -p /app/data /app/public/uploads /app/logs && chown -R nodejs:nodejs /app/data /app/public/uploads /app/logs

# 设置权限
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/dev.db

# 启动命令
CMD ["node", "dist/server/entry.mjs"]
