import express from "express";

import {
  createDocument,
  getAllRespectedUserDocuments,
  getSingleUserDocument,
  updateDocument,
  deleteDocument,
  addCollaborator,
  getAllCollaborators,
} from "../controllers/doc.controller.js";

import extractUser from "../middlewares/auth.extract.js";

const documentRouter = express.Router();

documentRouter
  .route("/")
  .get(extractUser, getAllRespectedUserDocuments)
  .post(extractUser, createDocument);
documentRouter
  .route("/:documentId")
  .get(extractUser, getSingleUserDocument)
  .patch(extractUser, updateDocument)
  .delete(extractUser, deleteDocument);
documentRouter
  .route("/add-collaborator/:documentId")
  .patch(extractUser, addCollaborator);
documentRouter
  .route("/get-all-collaborators/:documentId")
  .get(extractUser, getAllCollaborators);

export default documentRouter;
