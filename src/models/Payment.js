import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    bookingRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingRequest',
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    receipt: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'pending', 'failed'],
      default: 'created',
    },
    notes: {
      type: Object,
      default: {},
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpaySignature: String,
    gatewayStatus: String,
    paidAt: Date,
    failedReason: String,
  },
  { timestamps: true }
)

paymentSchema.index({ user: 1, createdAt: -1 })
paymentSchema.index({ property: 1 })
paymentSchema.index({ bookingRequest: 1 })
paymentSchema.index({ status: 1 })

const Payment = mongoose.model('Payment', paymentSchema)
export default Payment
