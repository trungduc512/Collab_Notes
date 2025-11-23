import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ message: `User with email ${email} already exists` });
    const doesUsernameExists = await User.findOne({ username });
    if (doesUsernameExists)
      return res
        .status(400)
        .json({ message: `Username ${username} already exists` });
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await User.create({
      email,
      password: hashedPassword,
      username,
    });
    res.status(201).json({
      user: result,
      message: `Registration successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (!existingUser)
      return res.status(404).json({ message: "User doesn't exist" });
    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = generateAccessToken(existingUser);
    const refreshToken = generateRefreshToken(existingUser);

    // Store refresh token in database
    existingUser.refreshToken = refreshToken;
    await existingUser.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      user: existingUser,
      accessToken,
      message: "Login successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
