import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['lead_assigned', 'lead_status_updated', 'inquiry_received', 'wishlist_price_drop', 'message', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      leadId: mongoose.Schema.Types.ObjectId,
      propertyId: mongoose.Schema.Types.ObjectId,
      actionUrl: String, // Link to navigate (e.g., /leads/123, /buyer/inquiries)
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  { timestamps: true }
)

// Index for faster queries
notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, read: 1 })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
