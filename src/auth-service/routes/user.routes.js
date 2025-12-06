import express from "express";
import {
  register,
  login,
  me,
  getUserByEmail,
} from "../controllers/auth.controller.js";
import { refreshAccessToken } from "../controllers/token.controller.js";
import extractUser from "../middlewares/extractUser.js";

const userRouter = express.Router();

userRouter.get("/by-email/:email", getUserByEmail);

userRouter.post("/refresh-token", refreshAccessToken);

userRouter.route("/register").post(register);
userRouter.route("/login").post(login);
userRouter.route("/me").get(extractUser, me);

export default userRouter;
