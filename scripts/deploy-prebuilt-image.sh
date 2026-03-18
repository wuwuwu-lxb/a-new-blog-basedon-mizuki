#!/bin/bash
# Mizuki 博客 - 上传预构建的 Docker 镜像并部署
# 用法：./scripts/deploy-prebuilt-image.sh [服务器 IP]

set -e

SERVER_IP="${1:-122.51.86.252}"
SERVER_USER="root"
SERVER_PORT="22"
PROJECT_DIR="/opt/mizuki-blog"
IMAGE_NAME="mizuki-blog-web:latest"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 SSH 连接
check_ssh() {
    log_info "检查 SSH 连接..."
    if ! ssh -i ~/.ssh/id_ed25519 -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
        "${SERVER_USER}@${SERVER_IP}" "echo 'SSH 连接成功'" 2>/dev/null; then
        log_error "SSH 连接失败"
        exit 1
    fi
    log_info "SSH 密钥验证成功"
}

# 保存 Docker 镜像
save_image() {
    log_info "保存 Docker 镜像为 tarball..."
    docker save -o /tmp/mizuki-blog-web.tar "$IMAGE_NAME"
    log_info "镜像已保存：/tmp/mizuki-blog-web.tar ($(du -h /tmp/mizuki-blog-web.tar | cut -f1))"
}

# 上传镜像
upload_image() {
    log_info "上传 Docker 镜像到服务器..."
    rsync -avz --progress -e "ssh -i ~/.ssh/id_ed25519 -p $SERVER_PORT -o StrictHostKeyChecking=no" \
        /tmp/mizuki-blog-web.tar "${SERVER_USER}@${SERVER_IP}:/tmp/mizuki-blog-web.tar"
}

# 服务器端部署
remote_deploy() {
    log_info "在服务器上部署..."

    ssh -i ~/.ssh/id_ed25519 -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
        "${SERVER_USER}@${SERVER_IP}" << 'EOF'
set -e

PROJECT_DIR="/opt/mizuki-blog"
IMAGE_NAME="mizuki-blog-web:latest"

cd "$PROJECT_DIR"

echo "=== 加载 Docker 镜像 ==="
docker load -i /tmp/mizuki-blog-web.tar

echo "=== 检查环境变量 ==="
if [ ! -f .env ]; then
    echo "[WARN] .env 文件不存在，创建默认配置"
    cat > .env << 'ENVEOF'
DATABASE_URL=file:/app/data/dev.db
JWT_SECRET=mizuki-jwt-secret-key-prod-abc123
OPENAI_API_KEY=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
CHAT_MODEL=meta/llama-3.1-70b-instruct
CHAT_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5
EMBEDDING_API_URL=https://integrate.api.nvidia.com/v1/embeddings
ENVEOF
    echo "[WARN] 请手动编辑 .env 文件修改 JWT_SECRET 和 API 密钥"
fi

echo "=== 初始化数据库 ==="
docker run --rm \
    -v "$PROJECT_DIR/data:/app/data" \
    -e DATABASE_URL=file:/app/data/dev.db \
    "$IMAGE_NAME" \
    npx prisma db push --schema ./prisma/schema.prisma || true

echo "=== 停止旧容器 ==="
docker stop mizuki-blog-web 2>/dev/null || true
docker rm mizuki-blog-web 2>/dev/null || true

echo "=== 启动新容器 ==="
docker run -d \
    --name mizuki-blog-web \
    -p 4321:4321 \
    -v "$PROJECT_DIR/data:/app/data" \
    -v "$PROJECT_DIR/public/uploads:/app/public/uploads" \
    -v "$PROJECT_DIR/.views-cache.json:/app/.views-cache.json" \
    -v "$PROJECT_DIR/logs:/app/logs" \
    --env-file .env \
    --restart unless-stopped \
    "$IMAGE_NAME"

echo "=== 验证部署 ==="
sleep 5
docker ps --filter name=mizuki-blog-web
docker logs mizuki-blog-web --tail 10

echo ""
echo "=== 部署完成 ==="
echo "访问地址：http://${SERVER_IP}:4321"
echo "查看日志：docker logs -f mizuki-blog-web"

# 清理
rm -f /tmp/mizuki-blog-web.tar
EOF
}

# 主函数
main() {
    log_info "Mizuki 博客预构建镜像部署脚本"
    log_info "目标服务器：${SERVER_USER}@${SERVER_IP}:${SERVER_PORT}"

    check_ssh
    save_image
    upload_image
    remote_deploy

    log_info "清理本地临时文件..."
    rm -f /tmp/mizuki-blog-web.tar

    log_info "部署完成！"
}

main "$@"
