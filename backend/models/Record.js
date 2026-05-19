import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  
  extractedData: {
    date: { type: String, default: "" },
    shift: { type: String, default: "" }, // Will hold I, II, or III
    employeeNumber: { type: String, default: "" },
    opnCode: { type: String, default: "" }, // ADDED THIS NEWFIELD
    machineNumber: { type: String, default: "" },
    workOrderNumber: { type: String, default: "" },
    quantityProduced: { type: Number, default: null },
    timeTaken: { type: String, default: "" }
  },
  
  confidenceScore: { type: Number, default: 100 },
  
  validationRules: {
    isValid: { type: Boolean, default: true },
    errors: [{ type: String }] 
  },
  
  status: { 
    type: String, 
    enum: ['Pending Review', 'Reviewed & Saved'], 
    default: 'Pending Review' 
  }
}, { timestamps: true });

const Record = mongoose.model('Record', recordSchema);
export default Record;