// middlewares/wsAuth.js
import jwt from "jsonwebtoken";

export const verifyWsUpgrade = (req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      console.error("❌ WS Auth: missing token");
      return { ok: false, statusCode: 401, message: "Missing token" };
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || "super_access_secret_change_me"
    );

    // nhét user vào req để dùng sau nếu cần
    req.user = decoded;

    return { ok: true };
  } catch (err) {
    console.error("❌ WS Auth failed:", err.message);
    return { ok: false, statusCode: 401, message: "Invalid token" };
  }
};
