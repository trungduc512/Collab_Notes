import { createClient } from "redis";

let redisClient;

export const initRedis = async () => {
  redisClient = createClient({
    url: "redis://localhost:6379",
    // Nếu chạy docker: url: 'redis://redis:6379'
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  await redisClient.connect();
  console.log("Connected to Redis successfully");

  return redisClient;
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call initRedis() first.");
  }
  return redisClient;
};
