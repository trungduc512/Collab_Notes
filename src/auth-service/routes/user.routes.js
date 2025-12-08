import express from "express";
import {
  register,
  login,
  me,
  refreshToken,
  logout,
  verify,
  verifyQuery,
} from "../controllers/auth.controller.js";
import validateToken from "../middlewares/auth.middleware.js";

const userRouter = express.Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/refresh", refreshToken);
userRouter.post("/logout", validateToken, logout);
userRouter.get("/me", validateToken, me);

// Endpoint để Nginx / gateway gọi qua auth_request
userRouter.get("/verify", validateToken, verify);

// Verify token từ query param (cho WebSocket auth_request)
userRouter.get("/verify-ws", verifyQuery);

export default userRouter;
