// server.js - Auth Service
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

import userRouter from "./routes/user.routes.js";

dotenv.config();

const app = express();

// Port riêng cho auth-service
const PORT = process.env.AUTH_SERVICE_PORT || 3002;

// Kết nối MongoDB
// - Khi chạy Docker: nên dùng "mongodb://mongo:27017/collab_notes"
//   (mongo = tên service MongoDB trong docker-compose)
// - Khi chạy local: set MONGODB_URI trong .env nếu cần
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://mongo:27017/collab_notes";

app.use(express.json());

// Prefix chung cho các route auth
app.use("/api/v1/auth", userRouter);

// Health check cho kubernetes / docker-compose / nginx
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "auth-service" });
});

// Kết nối DB rồi mới start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ [auth-service] Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 [auth-service] Running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ [auth-service] MongoDB connection error:", err);
    process.exit(1); // Cho container restart lại
  });
