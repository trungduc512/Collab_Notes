import jwt from "jsonwebtoken";

// Gateway đã verify JWT - chỉ cần đọc X-User headers
export const validateToken = (req, res, next) => {
  const userId = req.header("X-User-Id");
  const username = req.header("X-User-Name");
  const email = req.header("X-User-Email");

  // Gateway đã verify, nếu không có header = chưa qua gateway
  if (!userId) {
    return res
      .status(401)
      .json({ msg: "Unauthorized - missing gateway headers" });
  }

  req.user = {
    id: userId,
    username: username || "",
    email: email || "",
  };

  console.log(`✅ [Gateway] User: ${userId} (${username})`);
  next();
};
