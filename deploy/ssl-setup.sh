#!/bin/bash
# SSL 证书安装脚本（使用 Let's Encrypt Certbot）
# 用法：./deploy/ssl-setup.sh your-domain.com

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查参数
if [ -z "$1" ]; then
    log_error "用法：$0 your-domain.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-admin@$DOMAIN}

# 检查是否安装了 Certbot
if ! command -v certbot &> /dev/null; then
    log_error "Certbot 未安装"
    echo ""
    echo "安装命令:"
    echo "  Ubuntu/Debian: sudo apt install certbot python3-certbot-nginx"
    echo "  CentOS/RHEL:   sudo yum install certbot python3-certbot-nginx"
    echo "  Docker:        docker run -it --rm --name certbot certbot/certbot --version"
    exit 1
fi

# 检查 Nginx 配置是否存在
NGINX_CONF="/etc/nginx/sites-available/mizuki"
if [ ! -f "$NGINX_CONF" ]; then
    log_error "Nginx 配置文件不存在：$NGINX_CONF"
    exit 1
fi

log_info "开始为 $DOMAIN 申请 SSL 证书..."

# 使用 Nginx 插件申请证书
certbot --nginx \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --redirect \
    --hsts \
    --staple-ocsp \
    --eff-email \
    --non-interactive

if [ $? -eq 0 ]; then
    log_info "SSL 证书申请成功！"
    echo ""
    echo "证书位置:"
    echo "  证书：/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  私钥：/etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo ""
    echo "自动续期：Certbot 已添加定时任务，无需手动续期"
    echo "手动续期测试：sudo certbot renew --dry-run"
else
    log_error "SSL 证书申请失败"
    exit 1
fi
