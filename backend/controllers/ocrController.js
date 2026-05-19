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

    // CRITICAL FIX: Prompt redesigned to extract an ARRAY of rows from the document table
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
              The document contains a table with multiple rows of logs. Extract EVERY populated data row sequentially.
              
              If any handwritten field value is blurry, scratched out, or hard to read, append an asterisk '*' at the end of that string (e.g., "MC-730*") so the validation deck can flag it.
              
              Return the output strictly matching this JSON structure:
              {
                "rows": [
                  {
                    "date": "Convert format to YYYY-MM-DD, e.g., '23/4' or '22/4/26' should map with year 2026",
                    "shift": "Extract shift value directly. Convert standard numbers 1, 2, 3 to Roman numerals I, II, III respectively to match company standards",
                    "employeeNumber": "string value from Emp. No column",
                    "opnCode": "string value from Opn Code column",
                    "machineNumber": "string value from Machine No. column",
                    "workOrderNumber": "string value from Work Order No. column",
                    "quantityProduced": integer_number from Qty. Prod. column. If it is a hyphen '-' or empty, put 0,
                    "timeTaken": "string value from Time taken column"
                  }
                ],
                "confidenceScore": integer_percentage_0_to_100
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
    const systemConfidence = parsedJSON.confidenceScore || 85;

    if (extractedRows.length === 0) {
      return res.status(422).json({ success: false, message: 'AI Engine could not safely parse any structured table lines.' });
    }

    const processedSavedStates = [];

    // Loop through each parsed row from the image table and apply business rules
    for (const row of extractedRows) {
      const anomaliesDetected = [];
      
      const cleanQty = row.quantityProduced;
      if (!cleanQty && cleanQty !== 0) anomaliesDetected.push('Missing Key: Quantity metric is empty.');
      if (!row.workOrderNumber) anomaliesDetected.push('Missing Key: Work Order token is empty.');
      
      const validShifts = ['I', 'II', 'III'];
      const currentShift = (row.shift || '').toUpperCase().trim();
      if (currentShift && !validShifts.includes(currentShift)) {
        anomaliesDetected.push(`Scheduling Anomaly: Invalid shift format parsed: ${row.shift}`);
      }

      // Check Duplicate Work Order numbers across previous DB logs
      if (row.workOrderNumber) {
        const cleanWO = String(row.workOrderNumber).replace('*', '').trim();
        const isDuplicate = await Record.findOne({ 'extractedData.workOrderNumber': cleanWO });
        if (isDuplicate) {
          anomaliesDetected.push(`Security Exception: Duplicate Work Order Number '${cleanWO}' already caught inside audit database.`);
        }
      }

      const pipelineRecord = new Record({
        fileName: req.file.originalname,
        filePath: targetPath.replace(/\\/g, '/'),
        extractedData: {
          date: row.date || '',
          shift: currentShift || 'I',
          employeeNumber: row.employeeNumber || '',
          opnCode: row.opnCode || '',
          machineNumber: row.machineNumber || '',
          workOrderNumber: row.workOrderNumber || '',
          quantityProduced: isNaN(Number(cleanQty)) ? 0 : Number(cleanQty),
          timeTaken: row.timeTaken || ''
        },
        confidenceScore: systemConfidence,
        validationRules: {
          isValid: anomaliesDetected.length === 0,
          errors: anomaliesDetected
        },
        status: 'Pending Review'
      });

      const savedState = await pipelineRecord.save();
      processedSavedStates.push(savedState);
    }

    // Return the first parsed row to populate immediate verification deck, rest go to history table
    return res.status(201).json({ success: true, data: processedSavedStates[0] });

  } catch (error) {
    console.error('OCR Extraction Pipeline Crash:', error);
    return res.status(500).json({ success: false, message: 'AI Parsing engine failed.', error: error.message });
  }
};