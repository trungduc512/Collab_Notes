# Image Node.js nhẹ
FROM node:18-alpine

# Thư mục làm việc trong container
WORKDIR /usr/src/app

# Copy package.json & package-lock.json (nếu có) để tận dụng cache
COPY package*.json ./

# Cài dependencies (chỉ production)
RUN npm install --omit=dev

# Copy toàn bộ source code vào container
COPY . .

# Biến môi trường cơ bản
ENV NODE_ENV=production

# Mặc định expose port 3002 (trùng với AUTH_SERVICE_PORT default)
EXPOSE 3002

# Lệnh chạy service
CMD ["npm", "start"]
