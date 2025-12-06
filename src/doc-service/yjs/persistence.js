import { MongodbPersistence } from "y-mongodb-provider";

export const initYPersistence = (mongoUri) => {
  return new MongodbPersistence(mongoUri, {
    collectionName: "yjs-transactions",
    flushSize: 100,
  });
};
