import jwt from "jsonwebtoken";

export const validateToken = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token)
      return res.status(401).json({ msg: "No token, authorization denied" });

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || "super_access_secret_change_me"
    );

    req.user = decoded; // { id, email, username }
    next();
  } catch (err) {
    console.error("Token error:", err);
    return res.status(401).json({
      msg: "Token is not valid",
      error: err.message,
    });
  }
};
