import express from "express";
import { Server } from "socket.io";
import { socketCtrl } from "./controllers/socket.controller.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import userRouter from "./routes/user.routes.js";
import documentRouter from "./routes/document.routes.js";
import dbConnect from "./utils/dbConnect.js";
import cors from "cors";
import client from "prom-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// [THÊM] Khởi tạo Default Metrics (CPU, RAM, Event Loop...)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "client", "dist")));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/documents", documentRouter);
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (ex) {
    res.status(500).end(ex);
  }
});

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
