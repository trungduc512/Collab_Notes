# Sử dụng Node.js bản nhẹ (Alpine)
FROM node:18-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file package.json trước để tận dụng Docker Cache
# (Nếu code thay đổi nhưng thư viện không đổi thì không cần install lại)
COPY package*.json ./

# Cài đặt dependencies (chỉ cài các gói cần thiết cho production)
RUN npm install --production

# Copy toàn bộ source code vào image
COPY . .

# Khởi chạy worker
CMD ["npm", "start"]