// server.js
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { setupWSConnection, docs } from "y-websocket/bin/utils";
import * as Y from "yjs";

import { verifyWsUpgrade } from "./middlewares/wsAuth.js";
import {
  createKafkaProducer,
  sendYjsUpdate,
} from "./services/kafka.service.js";
import { loadDocFromService } from "./services/docLoader.service.js";
import { attachWsMessageHandlers } from "./yjs/wsMessages.js";

dotenv.config();

const PORT = process.env.WS_PORT || 1234;

// HTTP server chỉ để upgrade WS + healthcheck
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "websocket-service" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Yjs WebSocket Gateway");
});

const wss = new WebSocketServer({ noServer: true });

// Tạo Kafka producer
let producer;
createKafkaProducer()
  .then((p) => {
    producer = p;
  })
  .catch((err) => {
    console.error("❌ [ws] Failed to init Kafka producer:", err);
    process.exit(1);
  });

// Xử lý HTTP upgrade → WebSocket + Auth
server.on("upgrade", (req, socket, head) => {
  const authResult = verifyWsUpgrade(req);

  if (!authResult.ok) {
    socket.write(
      `HTTP/1.1 ${authResult.statusCode || 401} Unauthorized\r\n\r\n`
    );
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

// Khi client connect
wss.on("connection", async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docName = url.pathname.slice(1); // "/<docId>" → "<docId>"

  console.log(`🔌 [ws] Client connected to doc '${docName}'`);

  // Check xem doc có trong RAM không
  const existingDoc = docs.get(docName);
  console.log(`📋 [ws] Doc '${docName}' exists in RAM: ${!!existingDoc}`);

  if (existingDoc) {
    const content = existingDoc.getText("quill").toString();
    console.log(
      `📄 [ws] Current content in RAM: "${content.substring(0, 100)}..."`
    );
  }

  // Đăng ký handler của y-websocket
  setupWSConnection(ws, req, { docName, gc: true });

  // Handler cho message JSON đặc biệt (refresh token)
  attachWsMessageHandlers(ws);

  // Lấy Y.Doc tương ứng từ y-websocket
  const doc = docs.get(docName);

  // Nếu chưa load từ doc-service thì load
  if (!doc.isLoadedFromService) {
    const persisted = await loadDocFromService(docName);
    if (persisted) {
      const persistedUpdate = Y.encodeStateAsUpdate(persisted);
      Y.applyUpdate(doc, persistedUpdate);
    }
    doc.isLoadedFromService = true;
  }

  // Gắn listener để forward các update sang Kafka (nếu chưa gắn)
  if (!doc.kafkaListenerAttached) {
    doc.on("update", async (update, origin) => {
      if (!producer) return;
      try {
        await sendYjsUpdate(producer, docName, update);
      } catch (err) {
        console.error(
          `❌ [ws] Failed to send update for doc '${docName}' to Kafka:`,
          err
        );
      }
    });

    doc.kafkaListenerAttached = true;
    console.log(
      `📡 [ws] Attached Kafka forwarder for Yjs updates of doc '${docName}'`
    );
  }
});

server.listen(PORT, () => {
  console.log(`🚀 [ws] WebSocket gateway listening on port ${PORT}`);
});
