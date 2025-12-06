FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
FROM ubuntu:22.04

# Install OpenResty repository
RUN apt-get update && apt-get install -y wget gnupg ca-certificates

RUN wget -qO - https://openresty.org/package/pubkey.gpg | apt-key add - && \
    echo "deb http://openresty.org/package/ubuntu jammy main" \
    | tee /etc/apt/sources.list.d/openresty.list

# Install OpenResty + build tools + luarocks
RUN apt-get update && apt-get install -y \
    openresty \
    luarocks \
    build-essential

# Install lua-resty-jwt + cjson
RUN luarocks install lua-resty-jwt && \
    luarocks install lua-cjson

# Copy nginx config
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

EXPOSE 80
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
