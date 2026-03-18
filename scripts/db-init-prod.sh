#!/bin/bash
# Mizuki 博客 - 生产数据库初始化脚本

set -e

echo "=== Mizuki 博客数据库初始化 ==="

# 检查是否在正确的目录
if [ ! -f "prisma/schema.prisma" ]; then
    echo "错误：请在项目根目录运行此脚本"
    exit 1
fi

# 创建 prisma 目录
mkdir -p prisma

# 生成 Prisma 客户端
echo "生成 Prisma 客户端..."
npx prisma generate --schema ./prisma/schema.prisma

# 推送数据库结构（开发/生产环境通用）
echo "推送数据库结构..."
npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss

# 可选：种子数据
read -p "是否导入种子数据？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "导入种子数据..."
    npx prisma db seed --schema ./prisma/schema.prisma 2>/dev/null || \
    npx tsx prisma/seed.ts
fi

echo "=== 数据库初始化完成 ==="
