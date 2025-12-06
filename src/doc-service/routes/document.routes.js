import express from "express";
import {
  createDocument,
  getUserDocuments,
  getSingleDocument,
  deleteDocument,
  addCollaborator,
  getCollaborators,
} from "../controllers/document.controller.js";
import { validateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", validateToken, createDocument);
router.get("/", validateToken, getUserDocuments);
router.get("/:documentId", validateToken, getSingleDocument);
router.delete("/:documentId", validateToken, deleteDocument);
router.patch("/add-collaborator/:documentId", validateToken, addCollaborator);
router.get(
  "/get-all-collaborators/:documentId",
  validateToken,
  getCollaborators
);

export default router;
