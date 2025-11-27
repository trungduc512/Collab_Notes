import express from 'express';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import http from 'http';
import userRouter from './routes/user.routes.js';
import documentRouter from './routes/document.routes.js';
import dbConnect from './utils/dbConnect.js';
import cors from 'cors';
import { upgrade } from './y-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.use('/api/v1/users', userRouter);
app.use('/api/v1/documents', documentRouter);

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

const server = http.createServer(app);

upgrade(server);

server.listen(PORT, async () => {
  await dbConnect();
  console.log('Database connected successfully');
  console.log(`Server is running on http://localhost:${PORT}`);
});
