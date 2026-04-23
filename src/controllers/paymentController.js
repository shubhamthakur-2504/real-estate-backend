import crypto from 'crypto'
import Razorpay from 'razorpay'
import Payment from '../models/Payment.js'
import Property from '../models/Property.js'
import BookingRequest from '../models/BookingRequest.js'
import User from '../models/User.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'
import { createNotification } from './notificationController.js'
import { sendBookingPaymentStatusEmail } from '../services/emailService.js'

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.', 500)
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

const applySuccessfulBookingState = async (payment) => {
  if (!payment.bookingRequest) {
    return
  }

  const bookingRequest = await BookingRequest.findById(payment.bookingRequest)
  if (!bookingRequest) {
    return
  }

  bookingRequest.status = 'paid'
  bookingRequest.paidAt = payment.paidAt || new Date()
  bookingRequest.payment = payment._id
  await bookingRequest.save()

  await Property.findByIdAndUpdate(bookingRequest.property, {
    $set: { status: 'on_hold' },
  })

  try {
    const buyer = await User.findById(bookingRequest.buyer).select('email firstname lastname')
    const agent = await User.findById(bookingRequest.agent).select('email firstname lastname')
    const property = await Property.findById(bookingRequest.property).select('title')

    if (buyer?.email) {
      await createNotification(bookingRequest.buyer, {
        type: 'booking_token_paid',
        title: 'Booking Token Paid',
        message: `Your booking token for ${property?.title || 'a property'} has been received`,
        data: {
          bookingRequestId: bookingRequest._id,
          propertyId: bookingRequest.property,
          actionUrl: '/buyer/booking-requests',
        },
      })

      await sendBookingPaymentStatusEmail(buyer.email, {
        status: 'paid',
        buyerName: `${buyer.firstname || ''} ${buyer.lastname || ''}`.trim() || 'Buyer',
        propertyTitle: property?.title || 'Property',
        tokenAmount: payment.amount,
      })
    }

    if (agent?.email) {
      await createNotification(bookingRequest.agent, {
        type: 'booking_token_paid',
        title: 'Booking Token Paid',
        message: `Booking token received for ${property?.title || 'a property'}`,
        data: {
          bookingRequestId: bookingRequest._id,
          propertyId: bookingRequest.property,
          actionUrl: '/agent/booking-requests',
        },
      })
    }
  } catch (error) {
    console.error('Error sending booking payment notifications:', error.message)
  }
}

export const createOrder = asyncHandler(async (req, res) => {
  const { bookingRequestId } = req.body

  if (!bookingRequestId) {
    throw new AppError('bookingRequestId is required', 400)
  }

  const bookingRequest = await BookingRequest.findById(bookingRequestId)
    .populate('property', 'title price status')
    .populate('buyer', '_id')

  if (!bookingRequest) {
    throw new AppError('Booking request not found', 404)
  }

  if (String(bookingRequest.buyer._id) !== req.user.id) {
    throw new AppError('This booking request does not belong to you', 403)
  }

  if (bookingRequest.status !== 'pending') {
    throw new AppError('Booking request is not payable', 400)
  }

  if (new Date(bookingRequest.expiresAt).getTime() <= Date.now()) {
    bookingRequest.status = 'expired'
    await bookingRequest.save()
    throw new AppError('Booking request has expired', 400)
  }

  const property = bookingRequest.property

  if (!property || property.status !== 'active') {
    throw new AppError('Property is not available for booking token payment', 409)
  }

  const existingPaidRequest = await BookingRequest.findOne({
    property: property._id,
    status: 'paid',
  }).select('_id')

  if (existingPaidRequest) {
    throw new AppError('This property is already booked by another buyer', 409)
  }

  const amountInRupees = bookingRequest.tokenAmount
  const amountInPaise = amountInRupees * 100

  const razorpay = getRazorpayClient()
  const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 10000)}`

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes: {
      propertyId: String(property._id),
      buyerId: String(req.user.id),
      bookingRequestId: String(bookingRequest._id),
    },
  })

  const payment = await Payment.create({
    user: req.user.id,
    property: property._id,
    bookingRequest: bookingRequest._id,
    amount: amountInRupees,
    currency: 'INR',
    receipt,
    status: 'created',
    notes: {
      propertyTitle: property.title,
    },
    razorpayOrderId: order.id,
    gatewayStatus: order.status,
  })

  sendSuccessResponse(
    res,
    {
      paymentId: payment._id,
      orderId: order.id,
      bookingRequestId: bookingRequest._id,
      amount: amountInPaise,
      amountInRupees,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      property: {
        id: property._id,
        title: property.title,
      },
    },
    'Payment order created successfully',
    201
  )
})

export const verifyOrder = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required', 400)
  }

  const payment = await Payment.findOne({
    razorpayOrderId: razorpay_order_id,
    user: req.user.id,
  })

  if (!payment) {
    throw new AppError('Payment order not found', 404)
  }

  if (payment.status === 'paid') {
    sendSuccessResponse(
      res,
      {
        paymentId: payment._id,
        status: payment.status,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        alreadyVerified: true,
      },
      'Payment already verified'
    )
    return
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  const isValid = expectedSignature === razorpay_signature

  if (!isValid) {
    payment.status = 'failed'
    payment.failedReason = 'Invalid Razorpay signature'
    payment.razorpayPaymentId = razorpay_payment_id
    payment.razorpaySignature = razorpay_signature
    await payment.save()
    throw new AppError('Payment verification failed (invalid signature)', 400)
  }

  payment.status = 'paid'
  payment.razorpayPaymentId = razorpay_payment_id
  payment.razorpaySignature = razorpay_signature
  payment.paidAt = new Date()

  try {
    const razorpay = getRazorpayClient()
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id)
    payment.gatewayStatus = paymentDetails.status || 'captured'
  } catch (error) {
    payment.gatewayStatus = 'captured'
  }

  await payment.save()
  await applySuccessfulBookingState(payment)

  sendSuccessResponse(
    res,
    {
      paymentId: payment._id,
      status: payment.status,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      amount: payment.amount,
      paidAt: payment.paidAt,
    },
    'Payment verified successfully'
  )
})

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentId } = req.params

  const payment = await Payment.findOne({
    _id: paymentId,
    user: req.user.id,
  })
    .populate('property', 'title city price')

  if (!payment) {
    throw new AppError('Payment not found', 404)
  }

  sendSuccessResponse(
    res,
    {
      id: payment._id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      property: payment.property,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      gatewayStatus: payment.gatewayStatus,
      failedReason: payment.failedReason,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    },
    'Payment status fetched successfully'
  )
})

export const reconcilePayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params

  const payment = await Payment.findOne({
    _id: paymentId,
    user: req.user.id,
  })

  if (!payment) {
    throw new AppError('Payment not found', 404)
  }

  if (!payment.razorpayOrderId) {
    throw new AppError('No Razorpay order linked for this payment', 400)
  }

  const razorpay = getRazorpayClient()

  let gatewayPayment = null

  if (payment.razorpayPaymentId) {
    gatewayPayment = await razorpay.payments.fetch(payment.razorpayPaymentId)
  } else {
    const orderPayments = await razorpay.orders.fetchPayments(payment.razorpayOrderId)
    gatewayPayment = orderPayments?.items?.[0] || null
  }

  if (!gatewayPayment) {
    payment.status = payment.status === 'paid' ? 'paid' : 'pending'
    payment.gatewayStatus = 'created'
    await payment.save()

    sendSuccessResponse(
      res,
      {
        paymentId: payment._id,
        status: payment.status,
        gatewayStatus: payment.gatewayStatus,
      },
      'No captured payment found yet. Payment remains pending.'
    )
    return
  }

  payment.razorpayPaymentId = gatewayPayment.id
  payment.gatewayStatus = gatewayPayment.status

  if (gatewayPayment.status === 'captured' || gatewayPayment.status === 'authorized') {
    payment.status = 'paid'
    if (!payment.paidAt) {
      payment.paidAt = new Date()
    }
  } else if (gatewayPayment.status === 'failed') {
    payment.status = 'failed'
    payment.failedReason = gatewayPayment.error_description || 'Payment failed on gateway'
  } else {
    payment.status = 'pending'
  }

  await payment.save()

  if (payment.status === 'paid') {
    await applySuccessfulBookingState(payment)
  }

  sendSuccessResponse(
    res,
    {
      paymentId: payment._id,
      status: payment.status,
      gatewayStatus: payment.gatewayStatus,
      razorpayPaymentId: payment.razorpayPaymentId,
    },
    'Payment reconciled successfully'
  )
})

export const getMyPayments = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query

  const payments = await Payment.find({ user: req.user.id })
    .populate('property', 'title city price')
    .sort({ createdAt: -1 })
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    { payments },
    'Payments retrieved successfully'
  )
})
