# Mizuki 博客 - 生产环境 Dockerfile
# 简化版：仅构建 Astro 前端（API 已集成到主应用）

# ============================================
# 阶段 1: 基础环境 - 安装 pnpm
# ============================================
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ============================================
# 阶段 2: 构建 Astro 前端
# ============================================
FROM base AS builder
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml（利用 Docker 层缓存）
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies，因为需要构建）
RUN pnpm install --frozen-lockfile

# 复制配置文件
COPY astro.config.mjs svelte.config.js tsconfig.json ./
COPY prisma ./prisma
COPY public ./public
COPY src ./src
COPY scripts ./scripts

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 Astro（包含 prebuild 钩子：sync-content）
RUN pnpm build

# ============================================
# 阶段 3: 生产运行环境
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

# 复制 Astro 构建产物
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/astro.config.mjs ./
COPY --from=builder --chown=nodejs:nodejs /app/svelte.config.js ./
COPY --from=builder --chown=nodejs:nodejs /app/tailwind.config.js ./
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./

# 创建数据目录
RUN mkdir -p /app/data /app/public/uploads /app/logs && chown -R nodejs:nodejs /app/data /app/public/uploads /app/logs

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
