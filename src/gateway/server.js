import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
import { MongodbPersistence } from "y-mongodb-provider";
import http from "http";

const PORT = process.env.WS_PORT || 1234;
const MONGO_URL =
  process.env.MONGODB_URI || "mongodb://localhost:27017/collab_notes";

// 1. Cấu hình MongoDB Persistence (Lưu trữ dữ liệu)
const mdb = new MongodbPersistence(MONGO_URL, {
  collectionName: "yjs-transactions",
  flushSize: 100, // Gom 100 updates rồi mới ghi xuống DB một lần
});

// 2. Tạo HTTP Server (để lắng nghe yêu cầu Upgrade)
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Collab Notes WebSocket Server is running (No Auth)");
});

// 3. Tạo WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// 4. Xử lý sự kiện nâng cấp giao thức (Upgrade Handshake)
server.on("upgrade", (request, socket, head) => {
  // KHÔNG CÒN XÁC THỰC: Chấp nhận mọi kết nối
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// 5. Xử lý kết nối và đồng bộ dữ liệu Yjs
wss.on("connection", (conn, req) => {
  // Lấy docName từ URL. Ví dụ: ws://localhost:1234/my-doc -> docName = "my-doc"
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docName = url.pathname.slice(1);

  setupWSConnection(conn, req, {
    docName: docName,
    gc: true, // Dọn dẹp RAM khi không còn ai kết nối
    persistence: {
      provider: mdb,
      bindStaleDocs: true, // Tự động nạp dữ liệu cũ từ MongoDB lên
    },
  });

  console.log(`New WebSocket connection to document: ${docName}`);
});

// 6. Khởi chạy Server
server.listen(PORT, () => {
  console.log(`WebSocket Server is running on port ${PORT}`);
  console.log(`Persistence connected to: ${MONGO_URL}`);
});
