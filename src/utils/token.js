import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1m",
  });
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
