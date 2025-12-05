import express from "express";
import documentRouter from "./routes/document.routes.js";
import dbConnect from "./utils/dbConnect.js";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

app.use(cookieParser());

app.use("/documents", documentRouter);

app.listen(PORT, "0.0.0.0", async () => {
  await dbConnect();
  console.log(`Server is running on http://localhost:${PORT}`);
});
