import express from "express";
import { register, login, me } from "../controllers/auth.controller.js";
import { refreshAccessToken } from "../controllers/token.controller.js";
import validateToken from "../middlewares/auth.middleware.js";

const userRouter = express.Router();

userRouter.post("/refresh-token", refreshAccessToken);

userRouter.route("/register").post(register);
userRouter.route("/login").post(login);
userRouter.route("/me").get(validateToken, me);

export default userRouter;
