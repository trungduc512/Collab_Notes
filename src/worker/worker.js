const { Kafka } = require("kafkajs");
const { MongodbPersistence } = require("y-mongodb-provider");
const Y = require("yjs"); // Cần Yjs để xử lý logic update nếu cần

const KAFKA_BROKER = process.env.KAFKA_BROKER || "kafka:29092";
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://mongo:27017/collab_notes";
const TOPIC_NAME = "yjs-updates"; // Topic chứa binary update
const GROUP_ID = "yjs-storage-worker";

// === SETUP MONGODB PERSISTENCE ===
const mdb = new MongodbPersistence(MONGO_URI, {
  collectionName: "yjs-transactions",
  flushSize: 100, // Vẫn tận dụng khả năng batching của thư viện này
});

// === SETUP KAFKA ===
const kafka = new Kafka({
  clientId: "storage-worker",
  brokers: [KAFKA_BROKER],
});
const consumer = kafka.consumer({ groupId: GROUP_ID });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });

  console.log("✅ Worker is ready to write updates to MongoDB");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const docName = message.key.toString();
      const updateBuffer = message.value; // Đây là Buffer

      // Chuyển Buffer về Uint8Array mà Yjs hiểu
      const update = new Uint8Array(updateBuffer);

      console.log(
        `💾 Persisting update for doc: ${docName} (Size: ${update.length})`
      );

      try {
        // === GHI XUỐNG MONGO ===
        // Hàm storeUpdate của thư viện y-mongodb-provider sẽ lưu cái update nhỏ này vào DB
        await mdb.storeUpdate(docName, update);
        console.log(`✅ Update for doc '${docName}' written to MongoDB`);
      } catch (err) {
        console.error(`❌ Error writing to Mongo:`, err);
      }
    },
  });
};

run();
