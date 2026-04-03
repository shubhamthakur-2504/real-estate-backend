import Notification from '../models/Notification.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'

/**
 * Create a notification for a specific user (internal helper)
 * Called by other controllers when events happen
 */
export const createNotification = async (userId, { type, title, message, data = {} }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
    })
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    // Don't throw - notifications shouldn't break other operations
    return null
  }
}

/**
 * Get user's notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { read, limit = 20, page = 1 } = req.query
  const skip = (page - 1) * limit

  const filter = { user: req.user.id }
  if (read !== undefined) {
    filter.read = read === 'true'
  }

  const total = await Notification.countDocuments(filter)

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      notifications,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    },
    'Notifications retrieved successfully'
  )
})

/**
 * Get unread notification count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    user: req.user.id,
    read: false,
  })

  sendSuccessResponse(res, { unreadCount }, 'Unread count retrieved')
})

/**
 * Mark notification as read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: req.user.id },
    { read: true, readAt: new Date() },
    { new: true }
  )

  if (!notification) {
    throw new AppError('Notification not found', 404)
  }

  sendSuccessResponse(res, notification, 'Notification marked as read')
})

/**
 * Mark all notifications as read
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, read: false },
    { read: true, readAt: new Date() }
  )

  sendSuccessResponse(res, null, 'All notifications marked as read')
})

/**
 * Delete a notification
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params

  const notification = await Notification.findOneAndDelete({
    _id: id,
    user: req.user.id,
  })

  if (!notification) {
    throw new AppError('Notification not found', 404)
  }

  sendSuccessResponse(res, null, 'Notification deleted')
})

/**
 * Clear all notifications
 */
export const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user.id })

  sendSuccessResponse(res, null, 'All notifications cleared')
})
