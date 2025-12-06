import Document from "../models/document.model.js";
import User from "../models/user.model.js";

export const createDocument = async (req, res) => {
  try {
    const { title, isPublic } = req.body;

    const exists = await Document.findOne({ title, owner: req.user.id });
    if (exists)
      return res.status(400).json({ message: "Document already exists" });

    const count = await Document.countDocuments({ owner: req.user.id });
    if (count >= 10) return res.status(400).json({ message: "Limit reached" });

    const doc = await Document.create({
      title,
      isPublic,
      owner: req.user.id,
    });

    res.status(201).json({ document: doc, message: "Document created" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [{ owner: req.user.id }, { collaborators: req.user.id }],
    })
      .populate("owner", "username email")
      .populate("collaborators", "username email");

    res.status(200).json({ documents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSingleDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.documentId)
      .populate("owner", "username email")
      .populate("collaborators", "username email");

    if (!doc) return res.status(404).json({ message: "Document not found" });

    res.status(200).json({ document: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.documentId);
    if (!doc) return res.status(404).json({ message: "Not found" });

    if (doc.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not allowed" });

    await doc.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addCollaborator = async (req, res) => {
  try {
    const { collaboratorEmail } = req.body;
    const user = await User.findOne({ email: collaboratorEmail });

    if (!user) return res.status(404).json({ message: "User not found" });

    const doc = await Document.findById(req.params.documentId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.collaborators.includes(user._id))
      return res.status(400).json({ message: "Already collaborator" });

    doc.collaborators.push(user._id);
    await doc.save();

    res.json({ message: "Collaborator added" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCollaborators = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.documentId).populate(
      "collaborators",
      "username email"
    );
    if (!doc) return res.status(404).json({ message: "Not found" });

    res.json({ collaborators: doc.collaborators });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
