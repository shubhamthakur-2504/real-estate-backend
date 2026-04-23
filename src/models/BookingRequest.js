import mongoose from 'mongoose'

const bookingRequestSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'cancelled', 'refunded', 'completed'],
      default: 'pending',
    },
    notes: String,
    cancelReason: String,
    refundReason: String,
    refundedAt: Date,
    paidAt: Date,
    completedAt: Date,
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  { timestamps: true }
)

bookingRequestSchema.index({ buyer: 1, createdAt: -1 })
bookingRequestSchema.index({ property: 1, status: 1 })
bookingRequestSchema.index({ agent: 1, status: 1 })
bookingRequestSchema.index({ expiresAt: 1, status: 1 })

const BookingRequest = mongoose.model('BookingRequest', bookingRequestSchema)

export default BookingRequest
