import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs'; 
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import documentRoutes from './routes/documentRoutes.js';
import Record from './models/Record.js'; // <-- Added your actual Record Model for strict mapping

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

// =======================================================
// 💎 ADVANCED CRUD CONTROL ENGINES FOR BIZTEL OMNI PRO v2
// =======================================================

// 🛠️ 1. UPDATE ENDPOINT (EDIT TRANSACTION ROW FROM HISTORY/DECK)
app.put('/api/system/records/:id', async (req, res) => {
  try {
    const { updatedData, validationRules } = req.body;
    
    const updatedRecord = await Record.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          extractedData: updatedData,
          validationRules: validationRules,
          status: "Reviewed & Saved"
        } 
      },
      { new: true } // Returns the fresh updated document stream
    );

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: "Record not found in database ledger." });
    }

    console.log(`📝 Record ${req.params.id} updated and finalized cleanly.`);
    res.status(200).json({ success: true, message: "Transaction overrides synchronized successfully.", data: updatedRecord });
  } catch (error) {
    console.error("Update Controller Failure:", error);
    res.status(500).json({ success: false, message: "Failed to update record: " + error.message });
  }
});

// 🗑️ 2. DELETE ENDPOINT (REMOVE SINGLE TRANSACTION ROW FROM HISTORY TABLE)
app.delete('/api/system/records/:id', async (req, res) => {
  try {
    const deletedRecord = await Record.findByIdAndDelete(req.params.id);
    
    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: "Record not found in database ledger." });
    }

    console.log(`🗑️ Record ${req.params.id} successfully removed from audit logs.`);
    res.status(200).json({ success: true, message: "Operational log deleted from ledger repository." });
  } catch (error) {
    console.error("Delete Controller Failure:", error);
    res.status(500).json({ success: false, message: "Delete operation failure: " + error.message });
  }
});

// 🧹 3. GLOBAL SYSTEM RESET ENDPOINT (PURGE BOTH DB COLLECTION & FILESYSTEM)
app.delete('/api/system/reset', async (req, res) => {
  try {
    // 1. Wipe out all records from MongoDB Cloud Cluster safely using the model
    await Record.deleteMany({});
    
    // 2. Clear all physical files inside the uploads folder
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    }

    console.log('🧹 System reset complete: Database collection and uploads storage purged.');
    res.status(200).json({ success: true, message: "Database system cleanly purged." });
  } catch (error) {
    console.error("System Reset Failure:", error);
    res.status(500).json({ success: false, message: "Purge process failed: " + error.message });
  }
});

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