import express from "express";
import mongoose from "mongoose";
import { MongodbPersistence } from "y-mongodb-provider";
import * as Y from "yjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const PORT = process.env.DOC_SERVICE_PORT || 3001;
const MONGO_URL =
  process.env.MONGODB_URI || "mongodb://localhost:27017/collab_notes";
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key";

// === MONGODB PERSISTENCE (Yjs) ===
let mdb;
try {
  mdb = new MongodbPersistence(MONGO_URL, {
    collectionName: "yjs-transactions",
    flushSize: 100,
  });
} catch (err) {
  console.error("Failed to initialize Yjs Persistence:", err);
}

// === MONGOOSE MODELS ===
const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
      maxlength: 32,
      unique: true,
    },
    email: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);
const User = mongoose.model("User", userSchema);

// === EXPRESS APP ===
const app = express();
app.use(express.json());
app.use(cors());

// === MIDDLEWARE: Validate Token ===
const validateToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// =============================================
// === YJS DOCUMENT APIs (existing) ===
// =============================================

// Lấy state của document (cho Gateway)
app.get("/docs/:docName/state", async (req, res) => {
  try {
    const { docName } = req.params;
    console.log(`📖 Loading Yjs document: ${docName}`);

    const persistedDoc = await mdb.getYDoc(docName);
    const stateUpdate = Y.encodeStateAsUpdate(persistedDoc);

    res.set("Content-Type", "application/octet-stream");
    res.send(Buffer.from(stateUpdate));
  } catch (error) {
    console.error("❌ Error loading doc:", error);
    res.status(500).json({ error: "Failed to load document" });
  }
});

// Lưu update vào document (cho Worker gọi)
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

// Lấy metadata document
app.get("/docs/:docName/meta", async (req, res) => {
  try {
    const { docName } = req.params;
    const meta = await mdb.getMeta(docName);
    res.json(meta || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to get metadata" });
  }
});

// =============================================
// === DOCUMENT CRUD APIs (new) ===
// =============================================

// Create document
app.post("/api/v1/documents", validateToken, async (req, res) => {
  try {
    const { title, isPublic } = req.body;

    const doesDocumentExist = await Document.findOne({
      title,
      owner: req.user.id,
    });
    if (doesDocumentExist) {
      return res
        .status(400)
        .json({ message: `Document with title: ${title} already exists` });
    }

    const noOfDocuments = await Document.countDocuments({ owner: req.user.id });
    if (noOfDocuments >= 10) {
      return res
        .status(400)
        .json({ message: "You can't create more than 10 documents" });
    }

    const newDocument = await Document.create({
      title,
      isPublic,
      owner: req.user.id,
    });

    res.status(201).json({
      document: newDocument,
      message: `Document created successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all user documents
app.get("/api/v1/documents", validateToken, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user.id },
        { collaborators: { $elemMatch: { $eq: req.user.id } } },
      ],
    })
      .populate("owner", "username")
      .populate("collaborators", "username");

    res
      .status(200)
      .json({ documents, message: "All documents fetched successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single document
app.get("/api/v1/documents/:documentId", validateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId)
      .populate("owner", "username")
      .populate("collaborators", "username");

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.status(200).json({ document });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete document
app.delete("/api/v1/documents/:documentId", validateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this document" });
    }

    await Document.findByIdAndDelete(documentId);

    // Optionally: Clear Yjs data for this document
    // await mdb.clearDocument(documentId);

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add collaborator
app.patch(
  "/api/v1/documents/add-collaborator/:documentId",
  validateToken,
  async (req, res) => {
    try {
      const { documentId } = req.params;
      const { collaboratorEmail } = req.body;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const collaborator = await User.findOne({ email: collaboratorEmail });
      if (!collaborator) {
        return res.status(404).json({ message: "User not found" });
      }

      if (document.collaborators.includes(collaborator._id)) {
        return res
          .status(400)
          .json({ message: "User is already a collaborator" });
      }

      document.collaborators.push(collaborator._id);
      await document.save();

      res.status(200).json({ message: "Collaborator added successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get all collaborators
app.get(
  "/api/v1/documents/get-all-collaborators/:documentId",
  validateToken,
  async (req, res) => {
    try {
      const { documentId } = req.params;
      const document = await Document.findById(documentId).populate(
        "collaborators",
        "username email"
      );

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.status(200).json({ collaborators: document.collaborators });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// =============================================
// === HEALTH CHECK ===
// =============================================
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "doc-service" });
});

// === START SERVER ===
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`📚 Doc Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
