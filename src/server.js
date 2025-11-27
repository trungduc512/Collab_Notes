import express from "express";
import { Server } from "socket.io";
import { socketCtrl } from "./controllers/socket.controller.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import userRouter from "./routes/user.routes.js";
import documentRouter from "./routes/document.routes.js";
import dbConnect from "./utils/dbConnect.js";
import cors from "cors";
import * as Y from "yjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "client", "dist")));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/documents", documentRouter);

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

const server = app.listen(PORT, async () => {
  await dbConnect();
  console.log(`Server is running on http://localhost:${PORT}`);
});

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

socketCtrl(io);

// server.js
// import WebSocket, { WebSocketServer } from "ws";
// import * as Y from "yjs";
// import { applyUpdate, encodeStateAsUpdate } from "yjs";

// const wss = new WebSocketServer({ port: 3000 });
// console.log("Yjs collaboration server running at ws://localhost:1234");

// const docs = new Map();

// const getYDoc = (roomName) => {
//   if (!docs.has(roomName)) {
//     docs.set(roomName, new Y.Doc());
//   }
//   return docs.get(roomName);
// };

// wss.on("connection", (ws, req) => {
//   const urlParams = new URLSearchParams(req.url.replace("/", ""));
//   const roomName = urlParams.get("room") || "default";
//   const ydoc = getYDoc(roomName);

//   // Send current document state
//   ws.send(encodeStateAsUpdate(ydoc));

//   ws.on("message", (message) => {
//     const update = new Uint8Array(message);
//     applyUpdate(ydoc, update);

//     // Broadcast update to all clients except sender
//     wss.clients.forEach((client) => {
//       if (client !== ws && client.readyState === WebSocket.OPEN) {
//         client.send(update);
//       }
//     });
//   });

//   ws.on("close", () => console.log("Client disconnected"));
// });
