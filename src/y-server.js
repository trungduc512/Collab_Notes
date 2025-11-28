import { MongodbPersistence } from "y-mongodb-provider";
import { setupWSConnection } from "y-websocket/bin/utils";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });

const MONGO_URL =
  process.env.MONGODB_URI || "mongodb://localhost:27017/collab_notes";

const mdb = new MongodbPersistence(MONGO_URL, {
  collectionName: "yjs-transactions",
  flushSize: 100,
});

wss.on("connection", (conn, req) => {
  setupWSConnection(conn, req, {
    docName: req.url.slice(1).split("?")[0],
    gc: true,
    persistence: {
      provider: mdb,
      bindStaleDocs: true,
    },
  });
});

export const upgrade = (server) => {
  server.on("upgrade", (request, socket, head) => {
    // You may check auth of request here..

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
};
