#!/bin/bash
# Mizuki 博客 - 远程服务器部署脚本
# 用法：./scripts/deploy-to-server.sh [服务器 IP]

set -e

# 配置
SERVER_IP="${1:-122.51.86.252}"
SERVER_USER="root"
SERVER_PORT="22"
PROJECT_DIR="/opt/mizuki-blog"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 SSH 密钥
check_ssh() {
    log_info "检查 SSH 连接..."
    if ! ssh -i ~/.ssh/id_ed25519 -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
        "${SERVER_USER}@${SERVER_IP}" "echo 'SSH 连接成功'" 2>/dev/null; then
        log_warn "SSH 密钥登录失败，尝试密码登录"
        USE_PASSWORD=true
    else
        USE_PASSWORD=false
        log_info "SSH 密钥验证成功"
    fi
}

# 上传部署脚本
upload_deploy_script() {
    log_info "上传部署脚本到服务器..."

    # 创建远程部署脚本
    cat > /tmp/remote-deploy.sh << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

PROJECT_DIR="/opt/mizuki-blog"
cd "$PROJECT_DIR"

echo "=== Mizuki 博客服务器端部署 ==="

# 1. 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "[WARN] Docker Compose 未安装 (使用 docker compose 命令)"
fi

# 2. 检查环境变量
if [ ! -f .env ]; then
    echo "[INFO] .env 文件不存在，从 .env.example 复制"
    cp .env.example .env
    echo "[WARN] 请手动编辑 .env 文件配置 JWT_SECRET 和 API 密钥"
fi

# 3. 构建镜像
echo "[INFO] 构建 Docker 镜像..."
if command -v docker-compose &> /dev/null; then
    docker-compose build --no-cache
else
    docker compose build --no-cache
fi

# 4. 初始化数据库
echo "[INFO] 初始化数据库..."
if command -v docker-compose &> /dev/null; then
    docker-compose run --rm web npx prisma db push --schema ./prisma/schema.prisma || true
else
    docker compose run --rm web npx prisma db push --schema ./prisma/schema.prisma || true
fi

# 5. 启动服务
echo "[INFO] 启动服务..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# 6. 验证
echo "[INFO] 验证部署..."
sleep 5
if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

echo ""
echo "=== 部署完成 ==="
echo "访问地址：http://${SERVER_IP}:3000"
echo "查看日志：cd $PROJECT_DIR && docker compose logs -f"
REMOTE_SCRIPT

    chmod +x /tmp/remote-deploy.sh
}

# 执行远程部署
remote_deploy() {
    log_info "开始部署到 ${SERVER_IP}..."

    # 创建项目目录
    log_info "创建项目目录..."
    if [ "$USE_PASSWORD" = true ]; then
        sshpass -p "$SERVER_PASSWORD" ssh -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
            "${SERVER_USER}@${SERVER_IP}" "mkdir -p ${PROJECT_DIR}"
    else
        ssh -i ~/.ssh/id_ed25519 -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
            "${SERVER_USER}@${SERVER_IP}" "mkdir -p ${PROJECT_DIR}"
    fi

    # 上传项目文件
    log_info "上传项目文件..."
    if [ "$USE_PASSWORD" = true ]; then
        sshpass -p "$SERVER_PASSWORD" rsync -avz -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=no" \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude 'dist' \
            --exclude '.astro' \
            --exclude '*.db' \
            --exclude '.env' \
            ./ "${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/"
    else
        rsync -avz -e "ssh -i ~/.ssh/id_ed25519 -p $SERVER_PORT -o StrictHostKeyChecking=no" \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude 'dist' \
            --exclude '.astro' \
            --exclude '*.db' \
            --exclude '.env' \
            ./ "${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/"
    fi

    # 上传部署脚本
    log_info "上传部署脚本..."
    cp /tmp/remote-deploy.sh /tmp/remote-deploy-local.sh
    if [ "$USE_PASSWORD" = true ]; then
        sshpass -p "$SERVER_PASSWORD" scp -P "$SERVER_PORT" -o StrictHostKeyChecking=no \
            /tmp/remote-deploy-local.sh "${SERVER_USER}@${SERVER_IP}:/tmp/remote-deploy.sh"
    else
        scp -i ~/.ssh/id_ed25519 -P "$SERVER_PORT" -o StrictHostKeyChecking=no \
            /tmp/remote-deploy-local.sh "${SERVER_USER}@${SERVER_IP}:/tmp/remote-deploy.sh"
    fi

    # 执行远程部署
    log_info "执行远程部署..."
    if [ "$USE_PASSWORD" = true ]; then
        sshpass -p "$SERVER_PASSWORD" ssh -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
            "${SERVER_USER}@${SERVER_IP}" "chmod +x /tmp/remote-deploy.sh && /tmp/remote-deploy.sh"
    else
        ssh -i ~/.ssh/id_ed25519 -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
            "${SERVER_USER}@${SERVER_IP}" "chmod +x /tmp/remote-deploy.sh && /tmp/remote-deploy.sh"
    fi

    log_info "部署完成！"
}

# 主函数
main() {
    log_info "Mizuki 博客远程部署脚本"
    log_info "目标服务器：${SERVER_USER}@${SERVER_IP}:${SERVER_PORT}"

    check_ssh
    upload_deploy_script
    remote_deploy
}

main "$@"
