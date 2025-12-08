#!/bin/sh

echo "upstream websocket_cluster {" > /etc/nginx/conf.d/upstream.conf
echo "    hash \$uri consistent;" >> /etc/nginx/conf.d/upstream.conf

SERVICE_NAME="${APP_SERVICE_NAME:-websocket-service}"
SERVICE_PORT="${APP_PORT:-1234}"
MAX_SCAN=50

echo "🔍 Đang dò tìm các node backend..."

FOUND=0

for i in $(seq 1 $MAX_SCAN); do
    TARGET_HOST="${SERVICE_NAME}-$i"

    # Hiện thông tin đang quét
    echo "  ➡️  Quét: $TARGET_HOST ..."
    
    # Dùng ping thử 1 gói tin, timeout 1 giây
    if ping -c 1 -W 1 "$TARGET_HOST" > /dev/null 2>&1; then
        echo "   ✅ Tìm thấy: $TARGET_HOST (Alive)"
        echo "    server $TARGET_HOST:${SERVICE_PORT};" >> /etc/nginx/conf.d/upstream.conf
        FOUND=$((FOUND + 1))
    else
        echo "   🛑 Dừng quét tại số $i (Không tìm thấy $TARGET_HOST)"
        break
    fi
done

# Nếu không tìm thấy instance nào (chạy không scale), thử tên service trực tiếp
if [ $FOUND -eq 0 ]; then
    if ping -c 1 -W 1 "$SERVICE_NAME" > /dev/null 2>&1; then
        echo "   ✅ Tìm thấy: $SERVICE_NAME (Alive - Single instance)"
        echo "    server $SERVICE_NAME:${SERVICE_PORT};" >> /etc/nginx/conf.d/upstream.conf
        FOUND=1
    else
        echo "   ⚠️ Không tìm thấy backend, dùng fallback"
        echo "    server ${SERVICE_NAME}:${SERVICE_PORT};" >> /etc/nginx/conf.d/upstream.conf
    fi
fi

echo "}" >> /etc/nginx/conf.d/upstream.conf

echo ""
echo "📄 Upstream config:"
cat /etc/nginx/conf.d/upstream.conf
echo ""
echo "📊 Tổng số instance tìm thấy: $FOUND"

cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf

echo "🚀 Khởi động Nginx..."
exec nginx -g "daemon off;"