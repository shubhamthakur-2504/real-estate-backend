import express from 'express'
import {
  createOrder,
  verifyOrder,
  getPaymentStatus,
  reconcilePayment,
  getMyPayments,
} from '../controllers/paymentController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/orders', authMiddleware, createOrder)
router.post('/verify', authMiddleware, verifyOrder)
router.get('/my', authMiddleware, getMyPayments)
router.get('/:paymentId/status', authMiddleware, getPaymentStatus)
router.post('/:paymentId/reconcile', authMiddleware, reconcilePayment)

export default router
