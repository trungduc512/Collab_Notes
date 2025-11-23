#!/bin/sh

echo "upstream websocket_cluster {" > /etc/nginx/conf.d/upstream.conf
echo "    ip_hash;" >> /etc/nginx/conf.d/upstream.conf

MAX_SCAN=50
echo "🔍 Đang dò tìm các node backend..."

for i in $(seq 1 $MAX_SCAN); do
    TARGET_HOST="${APP_SERVICE_NAME}-$i"
    
    # SỬA Ở ĐÂY:
    # Dùng ping thử 1 gói tin, timeout 1 giây.
    # Nếu ping được nghĩa là host đó thực sự đang sống.
    if ping -c 1 -W 1 "$TARGET_HOST" > /dev/null 2>&1; then
        echo "   ✅ Tìm thấy: $TARGET_HOST (Alive)"
        echo "    server $TARGET_HOST:${APP_PORT};" >> /etc/nginx/conf.d/upstream.conf
    else
        echo "   🛑 Dừng quét tại số $i (Không tìm thấy $TARGET_HOST)"
        break
    fi
done

echo "}" >> /etc/nginx/conf.d/upstream.conf

cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf

# Không cần sleep dài nữa vì lệnh ping ở trên đã tốn thời gian đợi rồi
echo "🚀 Khởi động Nginx..."
exec nginx -g "daemon off;"