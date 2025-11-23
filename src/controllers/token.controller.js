import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { generateAccessToken } from "../utils/token.js";

export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token)
      return res.status(401).json({ message: "No refresh token provided" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token)
      return res.status(403).json({ message: "Invalid refresh token" });

    const newAccessToken = generateAccessToken(user);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: "Token expired or invalid" });
  }
};
