// websocket-service/server.js
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { socketCtrl } from "./socket.controller.js";

const app = express();
const PORT = process.env.WS_PORT || 5003;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

// WebSocket service không serve static/frontend, chỉ để health-check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "websocket-service" });
});

const server = http.createServer(app);

const io = new Server(server, {
  path: "/ws/socket.io/",
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
});

// Auth middleware cho Socket.IO – lấy user từ Gateway offloading
io.use((socket, next) => {
  // Gateway sẽ inject X-User-Id vào header trong quá trình handshake
  const userId = socket.handshake.headers["x-user-id"];

  if (!userId) {
    return next(new Error("Unauthorized: missing X-User-Id"));
  }

  // Optional: Gateway cũng có thể inject X-User-Name
  const username =
    socket.handshake.headers["x-user-name"] ||
    socket.handshake.auth?.username || // fallback từ client (ít tin cậy hơn)
    "Unknown";

  socket.user = { id: userId, username };

  // Ban đầu chưa có exp rõ ràng; sẽ được set khi client gửi refresh-auth lần đầu
  socket.authExpiresAt = null;

  next();
});

socketCtrl(io);

server.listen(PORT, () => {
  console.log(`✅ WebSocket service listening on port ${PORT}`);
});
