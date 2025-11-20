import DocumentModel from "../models/documents.model.js";
import User from "../models/user.model.js";
import { getRedisClient } from "../utils/redisConnect.js";

export const createDocument = async (req, res) => {
  try {
    const { title, isPublic } = req.body;

    const doesDocumentExist = await DocumentModel.findOne({ title });

    if (doesDocumentExist)
      return res
        .status(400)
        .json({ message: `Document with title : ${title} already exists` });

    const noOfDocuments = await DocumentModel.countDocuments({
      owner: req.user.id,
    });

    if (noOfDocuments >= 3)
      return res
        .status(400)
        .json({ message: `You can't create more than 3 documents` });

    const newDocument = await DocumentModel.create({
      title,
      isPublic,
      owner: req.user.id,
    });

    res.status(201).json({
      document: newDocument,
      message: `Document with title : ${title} created successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllRespectedUserDocuments = async (req, res) => {
  try {
    const documents = await DocumentModel.find({
      $or: [
        { owner: req.user.id },
        { collaborators: { $elemMatch: { $eq: req.user.id } } },
      ],
    })
      .populate("owner", "username")
      .populate("collaborators", "username");
    res
      .status(200)
      .json({ documents, message: `All documents fetched successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSingleUserDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    // Kiểm tra xem document có trong cache không
    try {
      const redisClient = getRedisClient();
      const cachedDocument = await redisClient.get(`document:${documentId}`);
      if (cachedDocument) {
        console.log(
          `✅ Document ${documentId} fetched from cache using controller`
        );
        return res.status(200).json({
          document: JSON.parse(cachedDocument),
          message: "Document fetched from cache successfully",
        });
      }
    } catch (cacheError) {
      console.error("Redis error:", cacheError);
    }
    const document = await DocumentModel.findById(documentId)
      .populate("owner", "username")
      .populate("collaborators", "username");
    // Lưu document vào cache
    try {
      const redisClient = getRedisClient();
      await redisClient.set(
        `document:${documentId}`,
        JSON.stringify(document),
        { EX: 3600 } // Cache trong 1 giờ
      );
      console.log(`✅ Document ${documentId} cached successfully`);
    } catch (cacheError) {
      console.error("Redis error:", cacheError);
    }
    res.status(200).json({ document });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDocThroughSocket = async (id) => {
  try {
    // --- Kiểm tra Redis Cache ---
    let cachedDocument = null;

    try {
      const redisClient = getRedisClient();
      cachedDocument = await redisClient.get(`document:${id}`);

      if (cachedDocument) {
        console.log(`✅ Document ${id} fetched from Redis cache (socket)`);
        return JSON.parse(cachedDocument);
      }
    } catch (cacheError) {
      // Không throw — để hệ thống fallback về MongoDB
      console.error("⚠️ Redis cache error:", cacheError);
    }

    // --- Fallback: Lấy từ MongoDB ---
    const document = await DocumentModel.findById(id);
    if (!document) {
      console.log(`❌ Document ${id} not found in DB`);
      return null;
    }

    // Lưu vào Redis để cache lần sau
    try {
      const redisClient = getRedisClient();
      await redisClient.set(
        `document:${id}`,
        JSON.stringify(document),
        { EX: 60 } // 60 giây cache, tùy bạn chỉnh
      );
      console.log(`🟩 Document ${id} saved to Redis cache`);
    } catch (cacheSetError) {
      console.error("⚠️ Redis set error:", cacheSetError);
    }

    return document;
  } catch (error) {
    console.error("❌ getDocThroughSocket error:", error);
    return null;
  }
};

export const updateDocument = async (req, res) => {
  const { documentId } = req.params;

  try {
    const doesDocumentExist = await DocumentModel.findById(documentId);

    if (!doesDocumentExist)
      return res
        .status(404)
        .json({ message: `Document with id : ${documentId} doesn't exist` });

    if (doesDocumentExist.owner.toString() !== req.user.id)
      return res
        .status(401)
        .json({ message: `You are not authorized to update this document` });

    const { content } = req.body;

    const updatedDocument = await DocumentModel.findByIdAndUpdate(
      documentId,
      { content },
      { new: true }
    );

    res.status(200).json({
      document: updatedDocument,
      message: `Document with id : ${documentId} updated successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  const { documentId } = req.params;

  try {
    const doesDocumentExist = await DocumentModel.findById(documentId);

    if (!doesDocumentExist)
      return res
        .status(404)
        .json({ message: `Document with id : ${documentId} doesn't exist` });

    if (doesDocumentExist.owner.toString() !== req.user.id)
      return res
        .status(401)
        .json({ message: `You are not authorized to delete this document` });

    await DocumentModel.findByIdAndDelete(documentId);

    res.status(200).json({
      message: `Document: ${
        doesDocumentExist?.title || ""
      } deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addCollaborator = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { collaboratorEmail } = req.body;

    const doesDocumentExist = await DocumentModel.findById(documentId);

    if (!doesDocumentExist)
      return res
        .status(404)
        .json({ message: `Document with id : ${documentId} doesn't exist` });

    if (doesDocumentExist.owner.toString() !== req.user.id)
      return res.status(401).json({
        message: `You are not authorized to add collaborator to this document`,
      });

    const doesCollaboratorExist = await User.findOne({
      email: collaboratorEmail,
    });
    if (!doesCollaboratorExist)
      return res.status(404).json({
        message: `Collaborator with email : ${collaboratorEmail} doesn't exist`,
      });

    if (
      doesDocumentExist.owner.toString() ===
      doesCollaboratorExist._id.toString()
    )
      return res.status(400).json({
        message: `${collaboratorEmail} is the owner of this document`,
      });

    if (doesDocumentExist.collaborators.includes(doesCollaboratorExist._id))
      return res
        .status(400)
        .json({ message: `${collaboratorEmail} is already a collaborator` });

    doesDocumentExist.collaborators.push(doesCollaboratorExist._id);
    const updatedDocument = await doesDocumentExist.save();

    res.status(200).json({
      document: updatedDocument,
      message: `Sucssesfully added ${doesCollaboratorExist.username} as a collaborator`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllCollaborators = async (req, res) => {
  try {
    const { documentId } = req.params;

    const doesDocumentExist = await DocumentModel.findById(documentId).populate(
      "collaborators",
      "username"
    );

    if (!doesDocumentExist)
      return res
        .status(404)
        .json({ message: `Document with id : ${documentId} doesn't exist` });

    res.status(200).json({
      collaborators: doesDocumentExist.collaborators,
      message: `All collaborators fetched successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
