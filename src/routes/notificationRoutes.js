import express from 'express'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notificationController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// Get notifications
router.get('/', getNotifications)

// Get unread count
router.get('/unread/count', getUnreadCount)

// Mark notification as read
router.put('/:id/read', markAsRead)

// Mark all as read
router.put('/all/read', markAllAsRead)

// Delete notification
router.delete('/:id', deleteNotification)

// Clear all
router.delete('/all', clearAllNotifications)

export default router
