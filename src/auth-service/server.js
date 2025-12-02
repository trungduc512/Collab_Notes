import express from "express";
import userRouter from "./routes/user.routes.js";
import dbConnect from "./utils/dbConnect.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

app.use(cookieParser());

app.use("/auth", userRouter);

app.listen(PORT, async () => {
  await dbConnect();
  console.log(`Server is running on http://localhost:${PORT}`);
});
