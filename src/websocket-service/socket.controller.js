// websocket-service/socket.controller.js
import jwt from "jsonwebtoken";
import { fetchDocument, saveDocument } from "./documentClient.js";

const roomUsers = {}; // { roomId: [ { userId, username } ] }

const JWT_SECRET = process.env.JWT_SECRET || "hao123"; // trùng với gateway / auth-service
const AUTH_CHECK_INTERVAL = 15_000; // 15s check một lần

export const socketCtrl = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.user.id;
    const username = socket.user.username;

    console.log(`User connected: ${userId} (${username})`);

    // Bắt đầu watcher auth cho socket này
    startAuthWatcher(socket);

    handleAuthEvents(socket);

    handleConnection(socket, io, userId, username);
  });
};

//Watcher: nếu quá hạn mà không refresh-auth thì disconnect
const startAuthWatcher = (socket) => {
  const timer = setInterval(() => {
    if (!socket.authExpiresAt) return; // chưa có thông tin exp -> bỏ qua

    if (Date.now() > socket.authExpiresAt) {
      console.log(
        `Auth expired for socket ${socket.id}, disconnecting user ${socket.user?.id}`
      );
      socket.emit("auth-expired");
      socket.disconnect(true);
    }
  }, AUTH_CHECK_INTERVAL);

  socket.on("disconnect", () => {
    clearInterval(timer);
  });
};

// Event runtime re-auth
const handleAuthEvents = (socket) => {
  socket.on("refresh-auth", (data = {}, callback = () => {}) => {
    const { token } = data;

    if (!token) {
      callback("token is required");
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // decoded: { id, email, iat, exp }

      // Cập nhật thông tin user theo token mới
      socket.user = {
        ...(socket.user || {}),
        id: decoded.id,
        email: decoded.email,
      };

      // Lưu lại thời điểm hết hạn từ exp trong JWT (exp là seconds)
      socket.authExpiresAt = decoded.exp ? decoded.exp * 1000 : null;

      console.log(
        `WS auth refreshed for user ${socket.user.id}, expiresAt=${socket.authExpiresAt}`
      );

      callback(null, { ok: true });
    } catch (err) {
      console.error("refresh-auth error:", err.message);
      callback("Invalid or expired token");
      socket.emit("auth-expired");
      socket.disconnect(true);
    }
  });
};

const handleConnection = (socket, io, userId, username) => {
  // Join document room
  socket.on("joinRoom", async (data, callback = () => {}) => {
    const { roomId } = data || {};
    if (!roomId) {
      callback("roomId is required");
      return;
    }

    try {
      //Kiểm tra quyền truy cập document thông qua document-service
      await fetchDocument(roomId, userId); // nếu không có quyền, sẽ throw

      socket.join(roomId);

      if (!roomUsers[roomId]) {
        roomUsers[roomId] = [];
      }

      const alreadyJoined = roomUsers[roomId].some((u) => u.userId === userId);
      if (!alreadyJoined) {
        roomUsers[roomId].push({ username, userId });
      }

      io.to(roomId).emit("someoneJoined", {
        username,
        roomUsers: roomUsers[roomId],
      });

      callback(null);
      console.log(`${username} joined room ${roomId}`);
    } catch (error) {
      console.error("Error in joinRoom:", error.message);
      callback(error.message || "Error joining room");
    }
  });

  // Leave room
  socket.on("leaveRoom", (data, callback = () => {}) => {
    const { roomId } = data || {};
    if (!roomId) {
      callback("roomId is required");
      return;
    }

    try {
      socket.leave(roomId);

      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(
          (user) => user.userId !== userId
        );

        io.to(roomId).emit("someoneLeft", {
          username,
          roomUsers: roomUsers[roomId],
        });
      }

      callback(null);
      console.log(`👋 ${username} left room ${roomId}`);
    } catch (error) {
      console.error("Error in leaveRoom:", error);
      callback("Error leaving room");
    }
  });

  // Cursor sync
  socket.on("send-cursor", (data = {}) => {
    const { roomId, range } = data;
    if (!roomId) return;

    socket.to(roomId).emit("receive-cursor", {
      username,
      range,
    });
  });

  // Realtime text changes
  socket.on("send-changes", (data = {}, callback = () => {}) => {
    const { roomId, delta } = data;
    if (!roomId || !delta) {
      callback("roomId and delta are required");
      return;
    }

    try {
      io.to(roomId).emit("receive-changes", {
        delta,
        username,
      });
      callback(null);
    } catch (error) {
      console.error("Error in send-changes:", error);
      callback("Error sending changes");
    }
  });

  // Load document content for a user
  socket.on("get-doc", async (data = {}) => {
    const { docId } = data;

    if (!docId) return;

    try {
      const doc = await fetchDocument(docId, userId);
      const content = doc?.content || "";

      socket.emit("load-document", content);
      console.log(`Loaded document ${docId} for ${username}`);
    } catch (error) {
      console.error("Error in get-doc:", error.message);
      socket.emit("load-document-error", {
        message: error.message || "Failed to load document",
      });
    }
  });

  // Save document content (autosave / manual)
  socket.on("save-doc", async (data = {}, callback = () => {}) => {
    const { docId, content } = data;
    if (!docId) {
      callback("docId is required");
      return;
    }

    if (!content) {
      callback("content is required");
      return;
    }

    try {
      await saveDocument(docId, userId, content);
      callback(null);
      console.log(`Saved document ${docId} by ${username}`);
    } catch (error) {
      console.error("Error in save-doc:", error.message);
      callback(error.message || "Error saving doc");
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    try {
      Object.keys(roomUsers).forEach((roomId) => {
        const before = roomUsers[roomId].length;
        roomUsers[roomId] = roomUsers[roomId].filter(
          (user) => user.userId !== userId
        );
        const after = roomUsers[roomId].length;

        if (before !== after) {
          io.to(roomId).emit("someoneLeft", {
            username,
            roomUsers: roomUsers[roomId],
          });
        }
      });

      console.log(`User disconnected: ${userId} (${username})`);
    } catch (error) {
      console.error("Error in disconnect:", error);
    }
  });
};
