import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true, required: true, maxlength: 32 },
    email: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true, collection: "users" }
);

export default mongoose.model("User", userSchema);
