#!/bin/bash
# Mizuki 博客 - Docker 构建脚本（独立使用）

set -e

IMAGE_NAME="mizuki-blog"
IMAGE_TAG="latest"

echo "=== Mizuki Docker 构建 ==="

# 构建镜像
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "=== 构建完成 ==="
echo ""
echo "镜像信息:"
docker images ${IMAGE_NAME}:${IMAGE_TAG}
echo ""
echo "运行容器:"
echo "  docker run -d -p 3000:3000 --name mizuki-blog ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "或使用 docker-compose:"
echo "  docker-compose up -d"
