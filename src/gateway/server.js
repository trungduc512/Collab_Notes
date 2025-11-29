import { WebSocketServer } from "ws";
import { setupWSConnection, docs } from "y-websocket/bin/utils";
import { MongodbPersistence } from "y-mongodb-provider";
import * as Y from "yjs"; // Cần import Yjs để xử lý merge update
import http from "http";
import { Kafka, Partitioners } from "kafkajs";

const PORT = process.env.WS_PORT || 1234;
const MONGO_URL =
  process.env.MONGODB_URI || "mongodb://localhost:27017/collab_notes";
const KAFKA_BROKER = process.env.KAFKA_BROKER || "kafka:29092";

// === 1. KAFKA PRODUCER ===
const kafka = new Kafka({ clientId: "ws-gateway", brokers: [KAFKA_BROKER] });
const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
});
producer.connect().then(() => console.log("✅ Kafka Producer Connected"));

const sendToKafka = async (docName, update) => {
  // update là Uint8Array, ta chuyển sang Buffer để gửi qua Kafka
  const buffer = Buffer.from(update);
  await producer.send({
    topic: "yjs-updates", // Topic chuyên chứa dữ liệu binary để sync
    messages: [{ key: docName, value: buffer }],
  });
};

// === 2. MONGODB (CHỈ ĐỂ ĐỌC LÚC ĐẦU) ===
const mdb = new MongodbPersistence(MONGO_URL, {
  collectionName: "yjs-transactions",
  flushSize: 100,
});

// === 3. SERVER SETUP ===
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Yjs Gateway Running (Read-Mongo / Write-Kafka)");
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

  // --- LOGIC LOAD DỮ LIỆU TỪ MONGO VÀO RAM ---
  // Kiểm tra xem doc này đã có trong RAM chưa
  // Nếu chưa có (docs.get trả về undefined), ta phải load từ Mongo lên
  if (!docs.has(docName)) {
    console.log(`📥 Loading document '${docName}' from MongoDB to RAM...`);

    // Tạo doc tạm để hứng dữ liệu
    const persistedDoc = await mdb.getYDoc(docName);

    // Lấy trạng thái binary từ doc vừa load
    const stateVector = Y.encodeStateAsUpdate(persistedDoc);

    // Ở đây ta dùng 1 mẹo: Để y-websocket tự tạo doc mới trong RAM,
    // sau đó ta apply dữ liệu cũ vào nó ngay lập tức.
  }

  // --- SETUP WEBSOCKET ---
  setupWSConnection(conn, req, {
    docName: docName,
    gc: true,
    // QUAN TRỌNG: KHÔNG TRUYỀN 'persistence' VÀO ĐÂY
    // Để server không tự động ghi xuống Mongo
  });

  // Sau khi setup xong, lấy doc ra để xử lý
  const doc = docs.get(docName);

  // Nếu đây là lần đầu doc được tạo (vừa load xong), ta cần merge dữ liệu từ Mongo vào
  // Lưu ý: Logic này hơi lắt léo vì y-websocket quản lý doc instance
  // Cách đơn giản nhất là dùng hàm getYDoc của mdb để lấy update và apply vào doc hiện tại
  if (!doc.isLoadedFromMongo) {
    const persistedDoc = await mdb.getYDoc(docName);
    const update = Y.encodeStateAsUpdate(persistedDoc);
    Y.applyUpdate(doc, update);
    doc.isLoadedFromMongo = true; // Đánh dấu đã load xong
  }

  // --- BẮT SỰ KIỆN UPDATE ĐỂ GỬI KAFKA ---
  if (!doc.kafkaListenerAttached) {
    doc.on("update", (update, origin) => {
      // update: Uint8Array (Binary change)
      // Gửi nguyên cục binary này sang Worker
      sendToKafka(docName, update);
    });
    doc.kafkaListenerAttached = true;
    console.log(`📡 Redirecting writes for '${docName}' to Kafka queue`);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
