// middlewares/wsAuth.js
import jwt from "jsonwebtoken";

export const verifyWsUpgrade = async (req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      console.error("❌ WS Auth: missing token");
      return { ok: false, statusCode: 401, message: "Missing token" };
    }

    // Gọi auth-service để verify
    const res = await fetch(
      `http://auth-service:3002/api/v1/auth/verify-ws?token=${token}`
    );
    const data = await res.json();

    if (res.status !== 200 || !data.user) {
      console.error("❌ WS Auth failed:", data.msg || data.error);
      return { ok: false, statusCode: 401, message: "Invalid token" };
    }

    req.user = data.user;
    console.log(`✅ WS Auth: user ${data.user.id} (${data.user.username})`);
    return { ok: true };
  } catch (err) {
    console.error("❌ WS Auth failed:", err.message);
    return { ok: false, statusCode: 401, message: "Auth service error" };
  }
};
