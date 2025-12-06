import express from "express";
import { MongodbPersistence } from "y-mongodb-provider";
import * as Y from "yjs";

const PORT = process.env.DOC_SERVICE_PORT || 3001;
const MONGO_URL =
  process.env.MONGODB_URI || "mongodb://localhost:27017/collab_notes";

// === MONGODB PERSISTENCE ===
const mdb = new MongodbPersistence(MONGO_URL, {
  collectionName: "yjs-transactions",
  flushSize: 100,
});

const app = express();
app.use(express.json());

// === API: Lấy state của document ===
app.get("/docs/:docName/state", async (req, res) => {
  try {
    const { docName } = req.params;
    console.log(`📖 Loading document: ${docName}`);

    const persistedDoc = await mdb.getYDoc(docName);
    const stateUpdate = Y.encodeStateAsUpdate(persistedDoc);

    // Trả về binary data
    res.set("Content-Type", "application/octet-stream");
    res.send(Buffer.from(stateUpdate));
  } catch (error) {
    console.error("❌ Error loading doc:", error);
    res.status(500).json({ error: "Failed to load document" });
  }
});

// === API: Lưu update vào document (cho Worker gọi) ===
app.post(
  "/docs/:docName/update",
  express.raw({ type: "application/octet-stream", limit: "10mb" }),
  async (req, res) => {
    try {
      const { docName } = req.params;
      const update = new Uint8Array(req.body);

      await mdb.storeUpdate(docName, update);
      console.log(`💾 Stored update for: ${docName}`);

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Error storing update:", error);
      res.status(500).json({ error: "Failed to store update" });
    }
  }
);

// === API: Lấy metadata document ===
app.get("/docs/:docName/meta", async (req, res) => {
  try {
    const { docName } = req.params;
    const meta = await mdb.getMeta(docName);
    res.json(meta || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to get metadata" });
  }
});

// === Health check ===
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "doc-service" });
});

app.listen(PORT, () => {
  console.log(`📚 Doc Service running on port ${PORT}`);
});
