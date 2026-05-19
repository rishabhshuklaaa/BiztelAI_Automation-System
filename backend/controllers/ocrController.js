import Groq from 'groq-sdk';
import fs from 'fs';
import Record from '../models/Record.js';

export const processDocumentIntake = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File buffer parameter not found.' });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const targetPath = req.file.path;
    const binaryData = fs.readFileSync(targetPath);
    const base64Asset = binaryData.toString('base64');

    // =========================================================================
    // 🧠 ADVANCED PROMPT ARCHITECTURE: GRANULAR PER-FIELD CONFIDENCE LOGIC
    // =========================================================================
    const extractionResponse = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      response_format: { type: 'json_object' }, 
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this handwritten factory machine shop log data sheet. 
              The document contains a table with multiple rows of data records. Extract EVERY populated data row sequentially.
              
              CRITICAL REQUIREMENT: For EVERY single field, you must extract its read value AND assign an individual confidence score (integer percentage between 0 and 100) based on how clear, blurry, or readable the handwriting is for that exact word.
              
              If any field is completely blank, empty, contains a dash/hyphen '-', or is scratched out, capture its value strictly as "—" and set its individual confidence score to 0.

              Return the output strictly matching this JSON schema layout structure:
              {
                "rows": [
                  {
                    "date": { "value": "YYYY-MM-DD format based on row input, map with year 2026", "confidence": 95 },
                    "shift": { "value": "Extract shift directly. Convert standard numbers 1, 2, 3 to Roman numerals I, II, III", "confidence": 90 },
                    "employeeNumber": { "value": "string value from Emp. No column", "confidence": 85 },
                    "opnCode": { "value": "string value from Opn Code column", "confidence": 88 },
                    "machineNumber": { "value": "string value from Machine No. column", "confidence": 92 },
                    "workOrderNumber": { "value": "string value from Work Order No. column", "confidence": 80 },
                    "quantityProduced": { "value": "string value from Qty. Prod. column. If blank or dash, put '—'", "confidence": 95 },
                    "timeTaken": { "value": "string value from Time taken column", "confidence": 85 }
                  }
                ]
              }`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Asset}` }
            }
          ]
        }
      ]
    });

    const parsedJSON = JSON.parse(extractionResponse.choices[0].message.content);
    const extractedRows = parsedJSON.rows || [];

    if (extractedRows.length === 0) {
      return res.status(422).json({ success: false, message: 'AI Engine could not safely parse any structured table lines.' });
    }

    const processedSavedStates = [];

    // =========================================================================
    // 🛡️ COMPLIANCE VALIDATION MATRIX LOOP FOR EACH EXTRACED RECORD ROW
    // =========================================================================
    for (const row of extractedRows) {
      const anomaliesDetected = [];

      // Extract raw values cleanly out of the structured field object
      const dateVal = String(row.date?.value || '').trim();
      const shiftVal = String(row.shift?.value || '').toUpperCase().trim();
      const empVal = String(row.employeeNumber?.value || '').trim();
      const opnVal = String(row.opnCode?.value || '').trim();
      const machVal = String(row.machineNumber?.value || '').toUpperCase().trim();
      const woVal = String(row.workOrderNumber?.value || '').trim();
      const qtyVal = String(row.quantityProduced?.value || '').trim();

      // Rule 1: Missing Mandatory Fields or Empty Whitespaces Check
      if (!dateVal || dateVal === "" || dateVal === "—") anomaliesDetected.push("Missing mandatory field: Operational Date is blank.");
      if (!empVal || empVal === "" || empVal === "—") anomaliesDetected.push("Missing mandatory field: Employee Number is blank.");
      if (!opnVal || opnVal === "" || opnVal === "—") anomaliesDetected.push("Missing mandatory field: OPN Code is blank.");

      // Rule 2: Empty Quantity Field Check
      if (!qtyVal || qtyVal === "" || qtyVal === "—") {
        anomaliesDetected.push("Empty Quantity Field: Production count is completely blank or missing numeric values.");
        if (row.quantityProduced) row.quantityProduced.confidence = 0; // Forced baseline safety drop
      } else {
        // Rule 3: Suspicious Numeric Values Check (e.g., negative or abnormally huge values)
        const cleanNumber = Number(qtyVal.replace('*', ''));
        if (isNaN(cleanNumber) || cleanNumber < 0 || cleanNumber > 500) {
          anomaliesDetected.push(`Suspicious Numeric Value: Detected an anomalous quantity count of (${qtyVal}).`);
        }
      }

      // Rule 4: Invalid Shift Values Check (Must be standard facility shifts I, II, III)
      const validShifts = ['I', 'II', 'III', '1', '2', '3'];
      if (!shiftVal || !validShifts.includes(shiftVal)) {
        anomaliesDetected.push(`Invalid Shift Value: '${shiftVal}' does not match standard facility rosters.`);
      }

      // Rule 5: Incorrect Machine Code Formats Check (Must adhere to facility codes naming norms like MC- or ABC-)
      if (!machVal || (!machVal.startsWith('MC-') && !machVal.startsWith('ABC-') && !machVal.startsWith('MC_'))) {
        anomaliesDetected.push(`Incorrect Machine Code Format: '${machVal}' pattern violates corporate nomenclature rules.`);
      }

      // Rule 6: Duplicate Work Order Numbers Check Across Database Repository Records
      if (woVal && woVal !== "—") {
        const cleanWO = woVal.replace('*', '').trim();
        const isDuplicate = await Record.findOne({ 'extractedData.workOrderNumber.value': cleanWO });
        if (isDuplicate) {
          anomaliesDetected.push(`Duplicate Work Order Number: Token '${cleanWO}' already processed inside previous transactions.`);
        }
      }

      // Create an assignment compliance structural schema model entry
      const pipelineRecord = new Record({
        fileName: req.file.originalname,
        filePath: targetPath.replace(/\\/g, '/'),
        extractedData: {
          date: { value: row.date?.value || '—', confidence: row.date?.confidence ?? 100 },
          shift: { value: shiftVal || '—', confidence: row.shift?.confidence ?? 100 },
          employeeNumber: { value: row.employeeNumber?.value || '—', confidence: row.employeeNumber?.confidence ?? 100 },
          opnCode: { value: row.opnCode?.value || '—', confidence: row.opnCode?.confidence ?? 100 },
          machineNumber: { value: row.machineNumber?.value || '—', confidence: row.machineNumber?.confidence ?? 100 },
          workOrderNumber: { value: row.workOrderNumber?.value || '—', confidence: row.workOrderNumber?.confidence ?? 100 },
          quantityProduced: { value: qtyVal || '—', confidence: row.quantityProduced?.confidence ?? 100 },
          timeTaken: { value: row.timeTaken?.value || '—', confidence: row.timeTaken?.confidence ?? 100 }
        },
        validationRules: {
          isValid: anomaliesDetected.length === 0,
          errors: anomaliesDetected
        },
        status: 'Pending Review'
      });

      const savedState = await pipelineRecord.save();
      processedSavedStates.push(savedState);
    }

    // =========================================================================
    // 🚀 CRITICAL CORE FIX: RETURN THE ENTIRE EXTRACTED ARRAY TO FRONTEND 
    // This allows the verification deck pagination state layout loops to process!
    // =========================================================================
    return res.status(201).json({ success: true, data: processedSavedStates });

  } catch (error) {
    console.error('OCR Extraction Pipeline Crash:', error);
    return res.status(500).json({ success: false, message: 'AI Parsing engine failed.', error: error.message });
  }
};