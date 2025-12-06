import { WebSocketServer } from "ws";
import { setupWSConnection, docs } from "y-websocket/bin/utils";
import * as Y from "yjs";
import http from "http";
import { Kafka, Partitioners } from "kafkajs";

const PORT = process.env.WS_PORT || 1234;
const KAFKA_BROKER = process.env.KAFKA_BROKER || "kafka:29092";
const DOC_SERVICE_URL =
  process.env.DOC_SERVICE_URL || "http://doc-service:3001";

// === 1. KAFKA PRODUCER ===
const kafka = new Kafka({ clientId: "ws-gateway", brokers: [KAFKA_BROKER] });
const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
});
producer.connect().then(() => console.log("✅ Kafka Producer Connected"));

const sendToKafka = async (docName, update) => {
  const buffer = Buffer.from(update);
  await producer.send({
    topic: "yjs-updates",
    messages: [{ key: docName, value: buffer }],
  });
};

// === 2. GỌI DOC SERVICE ĐỂ LOAD DOCUMENT ===
const loadDocFromService = async (docName) => {
  try {
    const response = await fetch(
      `${DOC_SERVICE_URL}/docs/${encodeURIComponent(docName)}/state`
    );
    if (!response.ok) {
      if (response.status === 404) return null; // Doc chưa tồn tại
      throw new Error(`Doc service error: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error(`❌ Failed to load doc '${docName}' from service:`, error);
    return null;
  }
};

// === 3. SERVER SETUP ===
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Yjs Gateway Running (Stateless)");
});
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// === 4. XỬ LÝ KẾT NỐI ===
wss.on("connection", async (conn, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docName = url.pathname.slice(1);

  // --- SETUP WEBSOCKET TRƯỚC ---
  setupWSConnection(conn, req, {
    docName: docName,
    gc: true,
  });

  const doc = docs.get(docName);

  // --- LOAD TỪ DOC SERVICE NẾU CHƯA CÓ ---
  if (!doc.isLoadedFromService) {
    console.log(`📥 Loading document '${docName}' from Doc Service...`);
    const stateUpdate = await loadDocFromService(docName);
    if (stateUpdate) {
      Y.applyUpdate(doc, stateUpdate);
    }
    doc.isLoadedFromService = true;
  }

  // --- BẮT SỰ KIỆN UPDATE ĐỂ GỬI KAFKA ---
  if (!doc.kafkaListenerAttached) {
    doc.on("update", (update, origin) => {
      sendToKafka(docName, update);
    });
    doc.kafkaListenerAttached = true;
    console.log(`📡 Redirecting writes for '${docName}' to Kafka queue`);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Gateway running on port ${PORT}`);
});
