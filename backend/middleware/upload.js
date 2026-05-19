import multer from 'multer';
import path from 'path';

// Define temporary disk engine storage configurations
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Saves physical assets to uploads directory
  },
  filename: (req, file, cb) => {
    // Unique naming token to prevent cross-file layout override errors
    const uniqueToken = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueToken + path.extname(file.originalname));
  }
});

// Guardrail pipeline filter ensuring only approved images pass through
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png/;
  const checkExt = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const checkMime = allowedExtensions.test(file.mimetype);

  if (checkExt && checkMime) {
    cb(null, true);
  } else {
    cb(new Error('Operational Notice: Only standard file extensions (.jpeg, .jpg, .png) are accepted.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file restriction
});

export default upload;