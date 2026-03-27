import multer from 'multer'
import { ALL_ALLOWED_MIMES } from '../config/cloudinary.js'

// Configure storage to memory (we'll upload to Cloudinary)
const storage = multer.memoryStorage()

// File filter to validate file types (uses Cloudinary config as source of truth)
const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images (jpg, png, webp) and documents (pdf, doc, docx)`), false)
  }
}

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10485760, // 10MB max file size
  },
})

// Single file upload middleware
export const uploadSingle = upload.single('file')

// Multiple files upload middleware
export const uploadMultiple = upload.array('files', 10) // Max 10 files

// Single file with field name
export const uploadWithFieldName = (fieldName) => upload.single(fieldName)

// Attach filename to request for later use
export const attachmentMiddleware = (req, res, next) => {
  if (req.file) {
    req.file.originalName = req.file.originalname
    req.file.mimeType = req.file.mimetype
    req.file.size = req.file.size
  }
  next()
}

export default upload
