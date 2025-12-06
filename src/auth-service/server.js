import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3002;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/collab_notes";
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key";

app.use(express.json());
app.use(cors());

// === USER MODEL ===
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
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// === ROUTES ===

// Register
app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: `User with email ${email} already exists` });
    }

    const doesUsernameExists = await User.findOne({ username });
    if (doesUsernameExists) {
      return res
        .status(400)
        .json({ message: `Username ${username} already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await User.create({
      email,
      password: hashedPassword,
      username,
    });

    res.status(201).json({
      user: result,
      message: "Registration successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User doesn't exist" });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: existingUser.email, id: existingUser._id },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      user: existingUser,
      token: token,
      message: "Logged in successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user (verify token)
app.get("/auth/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res
      .status(401)
      .json({ message: "Token is not valid", error: error.message });
  }
});

// Verify token (for other services)
app.post("/auth/verify", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(401)
        .json({ valid: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ valid: false, message: "User not found" });
    }

    res.status(200).json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
});

// Get user by ID (for other services)
app.get("/auth/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by email (for other services)
app.get("/auth/users/email/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select(
      "-password"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "auth-service" });
});

// === START SERVER ===
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
