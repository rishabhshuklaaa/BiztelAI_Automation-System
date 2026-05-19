import mongoose from 'mongoose';

// Flexible sub-document definition to cleanly track value and confidence per field
const FieldSchema = new mongoose.Schema({
  value: { type: String, default: '—' },
  confidence: { type: Number, default: 100 }
}, { _id: false });

const recordSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  
  extractedData: {
    date: FieldSchema,
    shift: FieldSchema,
    employeeNumber: FieldSchema,
    opnCode: FieldSchema,
    machineNumber: FieldSchema,
    workOrderNumber: FieldSchema,
    quantityProduced: FieldSchema,
    timeTaken: FieldSchema
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