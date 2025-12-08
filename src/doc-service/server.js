import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

import documentRoutes from "./routes/document.routes.js";
import generateYjsRoutes from "./routes/yjs.routes.js";
import { initYPersistence } from "./yjs/persistence.js";

dotenv.config();

const app = express();

app.use(express.json());

const PORT = process.env.DOC_SERVICE_PORT || 3001;
const MONGO_URL = process.env.MONGODB_URI;

// Init Yjs persistence
const yPersistence = initYPersistence(MONGO_URL);

// YJS API routes
app.use("/docs", generateYjsRoutes(yPersistence));

// Document CRUD
app.use("/api/v1/documents", documentRoutes);

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "doc-service" });
});

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Doc-service running on port ${PORT}`));
  })
  .catch((err) => console.error("Mongo error:", err));
