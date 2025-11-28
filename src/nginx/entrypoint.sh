#!/bin/sh

echo "upstream websocket_cluster {" > /etc/nginx/conf.d/upstream.conf
echo "    hash \$request_uri consistent;" >> /etc/nginx/conf.d/upstream.conf

MAX_SCAN=50 # Giới hạn tối đa vẫn là 50
echo "🔍 Đang dò tìm các node backend..."

for i in $(seq 1 $MAX_SCAN); do
    TARGET_HOST="${APP_SERVICE_NAME}-$i"
    
    # Ping kiểm tra (timeout 1 giây)
    if ping -c 1 -W 1 "$TARGET_HOST" > /dev/null 2>&1; then
        echo "   ✅ Tìm thấy: $TARGET_HOST (Alive)"
        echo "    server $TARGET_HOST:${APP_PORT};" >> /etc/nginx/conf.d/upstream.conf
    else
        # === SỬA Ở ĐÂY: Thêm break để thoát vòng lặp ngay ===
        echo "   🛑 Dừng quét tại $TARGET_HOST (Không tìm thấy)"
        break 
        # ===================================================
    fi
done

echo "}" >> /etc/nginx/conf.d/upstream.conf

cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf

echo "🚀 Khởi động Nginx..."
exec nginx -g "daemon off;"