#!/bin/bash
# Mizuki 博客 - Docker 部署脚本
# 用法：./scripts/deploy.sh [options]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
}

# 检查环境变量文件
check_env() {
    if [ ! -f .env ]; then
        log_warn ".env 文件不存在，从 .env.example 复制"
        cp .env.example .env
        log_warn "请编辑 .env 文件，填入正确的配置（特别是 JWT_SECRET）"
        read -p "按回车继续..."
    fi
}

# 构建镜像
build() {
    log_info "开始构建 Docker 镜像..."

    if command -v docker-compose &> /dev/null; then
        docker-compose build --no-cache
    else
        docker compose build --no-cache
    fi

    log_info "镜像构建完成"
}

# 初始化数据库
init_db() {
    log_info "初始化数据库..."

    # 创建数据目录
    docker volume create mizuki-db 2>/dev/null || true

    # 运行数据库迁移
    if command -v docker-compose &> /dev/null; then
        docker-compose run --rm web npx prisma migrate deploy --schema ./prisma/schema.prisma 2>/dev/null || \
        docker-compose run --rm web npx prisma db push --schema ./prisma/schema.prisma
    else
        docker compose run --rm web npx prisma migrate deploy --schema ./prisma/schema.prisma 2>/dev/null || \
        docker compose run --rm web npx prisma db push --schema ./prisma/schema.prisma
    fi

    log_info "数据库初始化完成"
}

# 启动服务
start() {
    log_info "启动服务..."

    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        docker compose up -d
    fi

    log_info "服务已启动"
}

# 停止服务
stop() {
    log_info "停止服务..."

    if command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        docker compose down
    fi

    log_info "服务已停止"
}

# 重启服务
restart() {
    stop
    sleep 2
    start
}

# 查看日志
logs() {
    if command -v docker-compose &> /dev/null; then
        docker-compose logs -f
    else
        docker compose logs -f
    fi
}

# 更新部署
update() {
    log_info "开始更新部署..."

    # 拉取最新代码
    log_info "拉取最新代码..."
    git pull origin main || git pull origin master

    # 重新构建
    build

    # 数据库迁移
    init_db

    # 重启服务
    restart

    log_info "更新部署完成"
}

# 显示帮助
help() {
    echo "Mizuki 博客 Docker 部署脚本"
    echo ""
    echo "用法：$0 [command]"
    echo ""
    echo "命令:"
    echo "  build     构建 Docker 镜像"
    echo "  start     启动服务"
    echo "  stop      停止服务"
    echo "  restart   重启服务"
    echo "  logs      查看日志"
    echo "  update    更新部署（拉取代码 + 重建 + 迁移）"
    echo "  init      初始化数据库"
    echo "  deploy    完整部署（构建 + 初始化 + 启动）"
    echo "  help      显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 deploy     # 首次部署"
    echo "  $0 update     # 更新部署"
    echo "  $0 logs       # 查看日志"
}

# 主函数
main() {
    check_docker

    case "${1:-deploy}" in
        build)
            check_env
            build
            ;;
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs
            ;;
        update)
            check_env
            update
            ;;
        init)
            check_env
            init_db
            ;;
        deploy)
            check_env
            build
            init_db
            start
            ;;
        help|--help|-h)
            help
            ;;
        *)
            log_error "未知命令：$1"
            help
            exit 1
            ;;
    esac
}

main "$@"
