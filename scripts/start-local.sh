#!/bin/bash
# Mizuki 本地生产环境测试脚本

set -e

echo "=== Mizuki 本地生产环境测试 ==="

# 进入项目目录
cd "$(dirname "$0")/.."

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    pnpm install --frozen-lockfile
fi

# 检查数据库
if [ ! -f "prisma/dev.db" ]; then
    echo "初始化数据库..."
    mkdir -p prisma
    npx prisma db push --schema ./prisma/schema.prisma
fi

# 设置环境变量
export NODE_ENV=production
export PORT=3000
export DATABASE_URL="file:./prisma/dev.db"
export JWT_SECRET="mizuki-dev-jwt-secret-key-2026-abc123xyz"

echo ""
echo "启动生产服务器..."
echo "访问地址：http://localhost:3000"
echo "健康检查：http://localhost:3000/api/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动 Astro 生产服务器
node dist/server/entry.mjs
