// services/kafka.service.js
import { Kafka, Partitioners } from "kafkajs";

export const createKafkaProducer = async () => {
  const broker = process.env.KAFKA_BROKER || "kafka:29092";

  const kafka = new Kafka({
    clientId: "ws-gateway",
    brokers: [broker],
  });

  const producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
  });

  await producer.connect();
  console.log("✅ [ws] Kafka producer connected to", broker);

  return producer;
};

export const sendYjsUpdate = async (producer, docName, update) => {
  const buffer = Buffer.from(update);

  await producer.send({
    topic: process.env.KAFKA_TOPIC || "yjs-updates",
    messages: [{ key: docName, value: buffer }],
  });
};
