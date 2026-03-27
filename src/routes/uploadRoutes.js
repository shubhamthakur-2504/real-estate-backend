import express from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { uploadSingle, uploadMultiple, attachmentMiddleware } from '../middlewares/upload.js'
import {
  uploadPropertyImage,
  uploadPropertyImages,
  uploadAvatar,
  deleteImage,
  getUploadStats,
} from '../controllers/uploadController.js'

const router = express.Router()

// All upload routes require authentication
router.use(authMiddleware)

// Property image uploads
router.post('/property/image', uploadSingle, attachmentMiddleware, uploadPropertyImage)
router.post('/property/images', uploadMultiple, uploadPropertyImages)

// User avatar upload
router.post('/avatar', uploadSingle, attachmentMiddleware, uploadAvatar)

// Delete image
router.delete('/image', deleteImage)

// Get upload usage statistics (for admins)
router.get('/stats', getUploadStats)

export default router
