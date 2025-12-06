export default function extractUser(req, res, next) {
  const userId = req.header("X-User-Id");
  if (!userId) return res.status(401).json({ message: "Missing user" });

  req.user = { id: userId };
  next();
}
