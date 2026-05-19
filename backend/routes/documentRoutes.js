import express from 'express';
import upload from '../middleware/upload.js';
import { processDocumentIntake } from '../controllers/ocrController.js';
import Record from '../models/Record.js';

const router = express.Router();

// Route 1: Upload a file and trigger the Groq AI extraction pipeline
router.post('/upload', upload.single('document'), processDocumentIntake);

// Route 2: Fetch all processed records from MongoDB for dashboard history and logs
router.get('/', async (req, res) => {
  try {
    // Fetch all records sorted by the newest entry first
    const records = await Record.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history logs.', error: error.message });
  }
});
// Route 3: Update records after manual operator review and verification
router.put('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedData } = req.body;

    // Find record and update the extractedData fields directly
    const updatedRecord = await Record.findByIdAndUpdate(
      id,
      {
        extractedData: updatedData,
        status: 'Reviewed & Saved', // Promote lifecycle state
        'validationRules.isValid': true, // Clear any automated validation blocks on manual override
        'validationRules.errors': [] // Reset error tracking array
      },
      { new: true } // Returns the modified document state
    );

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Record target not found.' });
    }

    res.status(200).json({ success: true, message: 'Record finalized successfully.', data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save reviewed record.', error: error.message });
  }
});

export default router;