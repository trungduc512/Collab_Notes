import express from "express";
import {
  getDocumentState,
  storeDocumentUpdate,
  getDocumentMeta,
} from "../controllers/yjs.controller.js";

const router = express.Router();

export default (mdb) => {
  router.get("/:docName/state", getDocumentState(mdb));

  router.post(
    "/:docName/update",
    express.raw({ type: "application/octet-stream", limit: "10mb" }),
    storeDocumentUpdate(mdb)
  );

  router.get("/:docName/meta", getDocumentMeta(mdb));

  return router;
};
