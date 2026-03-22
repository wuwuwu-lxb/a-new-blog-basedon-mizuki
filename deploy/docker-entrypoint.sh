#!/bin/bash
set -e

echo "[Entry] Starting Mizuki services..."

# ============================================
# 1. 数据库初始化
# ============================================
echo "[Entry] Checking database..."

# 确保数据目录存在
mkdir -p /app/data

# 初始化数据库（如需要）
if [ ! -f "/app/data/dev.db" ]; then
    echo "[Entry] No database found, running prisma db push..."
    cd /app && npx prisma db push
else
    echo "[Entry] Database already exists, skipping init"
fi

# Prisma migrate（如需要）
# cd /app && npx prisma migrate deploy

# ============================================
# 2. 启动 Next.js API (后台)
# ============================================
echo "[Entry] Starting Next.js API on port 3001..."
cd /app/api
NODE_ENV=production PORT=3001 node .next/standalone/server.js &
API_PID=$!
echo "[Entry] Next.js API started (PID: $API_PID)"

# ============================================
# 3. 启动 Astro SSR (后台)
# ============================================
echo "[Entry] Starting Astro SSR on port 4321..."
cd /app
NODE_ENV=production PORT=4321 node dist/server/entry.mjs &
ASTRO_PID=$!
echo "[Entry] Astro SSR started (PID: $ASTRO_PID)"

# ============================================
# 4. 等待服务启动
# ============================================
echo "[Entry] Waiting for services to be ready..."
sleep 5

# 健康检查
check_service() {
    local url=$1
    local name=$2
    local max_attempts=10
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "[Entry] $name is ready!"
            return 0
        fi
        echo "[Entry] Waiting for $name... (attempt $attempt/$max_attempts)"
        sleep 3
        attempt=$((attempt + 1))
    done
    echo "[Entry] WARNING: $name may not be fully ready"
    return 1
}

check_service "http://localhost:3001/api/health" "Next.js API"
check_service "http://localhost:4321" "Astro SSR"

# ============================================
# 5. 启动 Nginx
# ============================================
echo "[Entry] Starting Nginx on port 80..."
nginx -c /etc/nginx/http.conf -g 'daemon off;' &
NGINX_PID=$!
echo "[Entry] Nginx started (PID: $NGINX_PID)"

# ============================================
# 6. 监控进程，任意一个挂了就退出
# ============================================
echo "[Entry] All services started, monitoring..."

# 安装 trap 来处理 SIGTERM（docker stop）
trap "echo '[Entry] Received SIGTERM, shutting down...'; kill $API_PID $ASTRO_PID $NGINX_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# 等待任意进程退出
wait $API_PID $ASTRO_PID $NGINX_PID
EXIT_CODE=$?

echo "[Entry] A process exited with code $EXIT_CODE, stopping all services..."
kill $API_PID $ASTRO_PID $NGINX_PID 2>/dev/null
exit $EXIT_CODE
