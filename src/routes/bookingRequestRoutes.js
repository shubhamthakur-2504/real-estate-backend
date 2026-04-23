import express from 'express'
import {
  createBookingRequest,
  getMyBookingRequests,
  getAgentBookingRequests,
  cancelBookingRequest,
  markBookingRefunded,
  completeBookingRequest,
  expireBookingRequests,
} from '../controllers/bookingRequestController.js'
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/', authMiddleware, roleMiddleware('agent', 'admin'), createBookingRequest)
router.get('/buyer/my', authMiddleware, roleMiddleware('buyer'), getMyBookingRequests)
router.get('/agent/my', authMiddleware, roleMiddleware('agent', 'admin'), getAgentBookingRequests)
router.patch('/:id/cancel', authMiddleware, roleMiddleware('agent', 'admin'), cancelBookingRequest)
router.patch('/:id/refund', authMiddleware, roleMiddleware('agent', 'admin'), markBookingRefunded)
router.patch('/:id/complete', authMiddleware, roleMiddleware('agent', 'admin'), completeBookingRequest)
router.post('/expire/run', authMiddleware, roleMiddleware('admin'), expireBookingRequests)

export default router
