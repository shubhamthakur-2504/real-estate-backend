import express from 'express'
import { register, login, logout, refreshAccessToken, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail, getCurrentUser } from '../controllers/authController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Public routes
router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refreshAccessToken)
router.post('/verify-email', verifyEmail)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Protected routes
router.post('/logout', authMiddleware, logout)
router.post('/resend-verification', authMiddleware, resendVerificationEmail)
router.get('/me', authMiddleware, getCurrentUser)

export default router
