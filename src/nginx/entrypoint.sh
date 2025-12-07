#!/bin/sh

# Tạo file upstream.conf
echo "upstream websocket_cluster {" > /etc/nginx/conf.d/upstream.conf
echo "    hash \$request_uri consistent;" >> /etc/nginx/conf.d/upstream.conf

# Lấy tên service từ biến môi trường (mặc định là websocket-service)
SERVICE_NAME="${APP_SERVICE_NAME:-websocket-service}"
SERVICE_PORT="${APP_PORT:-1234}"

echo "🔍 Đang dò tìm các node backend..."

FOUND=0

# Thử tìm theo pattern có số (khi scale)
for i in $(seq 1 10); do
    TARGET_HOST="${SERVICE_NAME}-$i"
    
    if ping -c 1 -W 1 "$TARGET_HOST" > /dev/null 2>&1; then
        echo "   ✅ Tìm thấy: $TARGET_HOST"
        echo "    server $TARGET_HOST:${SERVICE_PORT};" >> /etc/nginx/conf.d/upstream.conf
        FOUND=$((FOUND + 1))
    else
        break 
    fi
done

# Nếu không tìm thấy theo pattern số, thử tên service trực tiếp
if [ $FOUND -eq 0 ]; then
    if ping -c 1 -W 1 "$SERVICE_NAME" > /dev/null 2>&1; then
        echo "   ✅ Tìm thấy: $SERVICE_NAME"
        echo "    server $SERVICE_NAME:${SERVICE_PORT};" >> /etc/nginx/conf.d/upstream.conf
        FOUND=1
    fi
fi

# Fallback nếu không tìm thấy gì
if [ $FOUND -eq 0 ]; then
    echo "   ⚠️ Không tìm thấy backend, dùng fallback"
    echo "    server websocket-service:${SERVICE_PORT};" >> /etc/nginx/conf.d/upstream.conf
fi

echo "}" >> /etc/nginx/conf.d/upstream.conf

echo "📄 Upstream config:"
cat /etc/nginx/conf.d/upstream.conf

cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf

echo "🚀 Khởi động Nginx..."
exec nginx -g "daemon off;"