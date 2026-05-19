import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs'; // <-- Added native FileSystem module
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import documentRoutes from './routes/documentRoutes.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 📁 DYNAMIC DIRECTORY AUTO-CREATION ENGINE
// ==========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('🚀 Operational "uploads/" directory automatically initialized!');
}

app.use(cors()); 
app.use(express.json()); 

app.use('/uploads', express.static(uploadDir));

// LINK ROUTES MIDDLEWARE HERE
app.use('/api/documents', documentRoutes);

app.get('/', (req, res) => {
  res.send('⚙️ BiztelAI Automation System Pipeline API running smoothly...');
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Automated backend processing engine deployed live on port: ${PORT}`);
    });
  } catch (error) {
    console.error(` Server startup process failed: ${error.message}`);
  }
};

startServer();