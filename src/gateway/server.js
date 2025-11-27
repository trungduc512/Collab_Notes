import express from "express";
import { Server } from "socket.io";

const PORT = 8080;

const app = express();
app.use(express.json());

// API
app.get("/api/ping", (req, res) => res.send("pong"));

const server = app.listen(PORT, () => {
  console.log(`${process.env.HOSTNAME} listening on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.IO events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("client-message", (msg) => {
    console.log("Received:", msg);
    socket.emit("server-message", `Server says: ${msg}`);
  });

  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});
