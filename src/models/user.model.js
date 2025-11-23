import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
      maxlength: 32,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    personalInfo: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    refreshToken: { type: String, default: null }, // <--- ADD
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
