# Sử dụng Nginx bản Alpine cho nhẹ và có sẵn trình quản lý gói
FROM nginx:alpine

# Cài đặt dos2unix để sửa lỗi định dạng dòng từ Windows
RUN apk add --no-cache dos2unix

# Copy file script và cấu hình vào container
COPY ./entrypoint.sh /entrypoint.sh
COPY ./nginx.conf.template /etc/nginx/nginx.conf.template

# 1. Chuyển đổi định dạng file script từ CRLF (Windows) sang LF (Linux)
# 2. Cấp quyền thực thi cho file script
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

# Chạy script khi container khởi động
ENTRYPOINT ["/entrypoint.sh"]