import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "super_access_secret_change_me";

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "super_refresh_secret_change_me";

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// ===== Helpers =====
const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    {
      id: user._id,
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

const buildAuthPayload = (user, accessToken, refreshToken) => ({
  user: {
    id: user._id,
    username: user.username,
    email: user.email,
  },
  token: accessToken,
  refreshToken,
});

// ===== Controllers =====

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email, password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "email and password are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // lưu refresh token vào DB (đơn giản: add, không revoke cũ)
    user.refreshTokens = [{ token: refreshToken }];
    await user.save();

    return res.status(200).json({
      ...buildAuthPayload(user, accessToken, refreshToken),
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(400).json({ message: "Missing refreshToken" });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const stored = user.refreshTokens.find(
      (item) => item.token === refreshToken
    );
    if (!stored) {
      return res.status(401).json({ message: "Refresh token is revoked" });
    }

    // rotate refresh token
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    user.refreshTokens = user.refreshTokens.filter(
      (item) => item.token !== refreshToken
    );
    user.refreshTokens.push({ token: newRefreshToken });

    await user.save();

    return res.status(200).json({
      ...buildAuthPayload(user, newAccessToken, newRefreshToken),
      message: "Token refreshed",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // có thể không gửi refreshToken -> clear hết
    if (!refreshToken && !req.user?.id) {
      return res.status(400).json({ message: "Missing data" });
    }

    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(
        (item) => item.token !== refreshToken
      );
    } else {
      user.refreshTokens = [];
    }

    await user.save();

    return res.status(200).json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Endpoint cho API Gateway dùng auth_request (Authorization header)
export const verify = async (req, res) => {
  // validateToken middleware đã gán req.user
  // Set headers cho NGINX auth_request
  res.set("X-User-Id", req.user.id || "");
  res.set("X-User-Name", req.user.username || "");
  res.set("X-User-Email", req.user.email || "");

  return res.status(200).json({ user: req.user });
};

// Verify token từ query param (cho WebSocket handshake)
export const verifyQuery = async (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || "super_access_secret_change_me"
    );

    // Set headers cho NGINX auth_request
    res.set("X-User-Id", decoded.id || "");
    res.set("X-User-Name", decoded.username || "");
    res.set("X-User-Email", decoded.email || "");

    return res.status(200).json({ user: decoded });
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ msg: "Invalid token" });
  }
};

// optional: lấy danh sách user (để debug)
export const getUsers = async (_req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
