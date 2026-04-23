import BookingRequest from '../models/BookingRequest.js'
import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'
import { createNotification } from './notificationController.js'
import { sendBookingRequestEmail, sendBookingPaymentStatusEmail } from '../services/emailService.js'

const getBookingTokenAmountInRupees = (propertyPrice) => {
  if (!Number.isFinite(propertyPrice) || propertyPrice <= 0) {
    return 1000
  }

  const onePercent = Math.round(propertyPrice * 0.01)
  return Math.max(1000, Math.min(onePercent, 50000))
}

export const createBookingRequest = asyncHandler(async (req, res) => {
  const { leadId, propertyId, buyerId, tokenAmount, expiresInDays = 3, notes } = req.body

  if (!leadId && (!propertyId || !buyerId)) {
    throw new AppError('Provide leadId or both propertyId and buyerId', 400)
  }

  let finalPropertyId = propertyId
  let finalBuyerId = buyerId
  let finalAgentId = req.user.id

  let lead = null
  if (leadId) {
    lead = await Lead.findById(leadId).select('property buyer buyerEmail agent status')
    if (!lead) {
      throw new AppError('Lead not found', 404)
    }

    if (lead.status === 'lost' || lead.status === 'converted') {
      throw new AppError('Cannot send booking token request for lost or converted leads', 400)
    }

    finalPropertyId = String(lead.property)
    finalAgentId = lead.agent ? String(lead.agent) : req.user.id

    if (lead.buyer) {
      finalBuyerId = String(lead.buyer)
    } else if (lead.buyerEmail) {
      const buyerByEmail = await User.findOne({ email: lead.buyerEmail, role: 'buyer' }).select('_id')
      if (buyerByEmail) {
        finalBuyerId = String(buyerByEmail._id)
      }
    }
  }

  if (!finalBuyerId || !finalPropertyId) {
    throw new AppError('Could not resolve buyer or property for booking request', 400)
  }

  const buyer = await User.findById(finalBuyerId).select('role')
  if (!buyer || buyer.role !== 'buyer') {
    throw new AppError('Booking request can only be created for a buyer account', 400)
  }

  const property = await Property.findById(finalPropertyId).select('status price agent owner title')
  if (!property) {
    throw new AppError('Property not found', 404)
  }

  if (property.status === 'sold') {
    throw new AppError('Cannot create booking request for sold property', 400)
  }

  const isAdmin = req.user.role === 'admin'
  const isAgentOwner = property.agent && property.agent.toString() === req.user.id
  const isPropertyOwner = property.owner && property.owner.toString() === req.user.id

  if (!isAdmin && !isAgentOwner && !isPropertyOwner) {
    throw new AppError('You are not authorized to create booking requests for this property', 403)
  }

  const activeRequest = await BookingRequest.findOne({
    property: finalPropertyId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).select('_id')

  if (activeRequest) {
    throw new AppError('An active booking request already exists for this property', 409)
  }

  if (property.status === 'on_hold') {
    throw new AppError('Property is currently on hold', 409)
  }

  const safeExpiryDays = Math.max(1, Math.min(Number(expiresInDays), 7))
  const amount = Number(tokenAmount) > 0 ? Number(tokenAmount) : getBookingTokenAmountInRupees(property.price)

  const bookingRequest = await BookingRequest.create({
    lead: lead?._id,
    property: finalPropertyId,
    buyer: finalBuyerId,
    agent: finalAgentId,
    createdBy: req.user.id,
    tokenAmount: amount,
    currency: 'INR',
    expiresAt: new Date(Date.now() + safeExpiryDays * 24 * 60 * 60 * 1000),
    status: 'pending',
    notes,
  })

  const populated = await BookingRequest.findById(bookingRequest._id)
    .populate('property', 'title city price status')
    .populate('buyer', 'firstname lastname email')
    .populate('agent', 'firstname lastname email')

  const buyerLink = '/buyer/booking-requests'

  await createNotification(finalBuyerId, {
    type: 'booking_request_created',
    title: 'Booking Token Request Received',
    message: `A booking token request was created for ${property.title}`,
    data: {
      bookingRequestId: bookingRequest._id,
      propertyId: property._id,
      actionUrl: buyerLink,
    },
  })

  await createNotification(finalAgentId, {
    type: 'booking_request_created',
    title: 'Booking Token Request Sent',
    message: `Booking token request created for ${property.title}`,
    data: {
      bookingRequestId: bookingRequest._id,
      propertyId: property._id,
      actionUrl: '/agent/booking-requests',
    },
  })

  try {
    const buyerUser = await User.findById(finalBuyerId).select('email firstname lastname')
    if (buyerUser?.email) {
      await sendBookingRequestEmail(buyerUser.email, {
        buyerName: `${buyerUser.firstname || ''} ${buyerUser.lastname || ''}`.trim() || 'Buyer',
        propertyTitle: property.title,
        tokenAmount: amount,
        expiresInDays: safeExpiryDays,
        notes,
      })
    }
  } catch (emailError) {
    console.error('Error sending booking request email:', emailError.message)
  }

  sendSuccessResponse(res, populated, 'Booking request created successfully', 201)
})

export const getMyBookingRequests = asyncHandler(async (req, res) => {
  const { status } = req.query
  const filter = { buyer: req.user.id }

  if (status) {
    filter.status = status
  }

  const bookingRequests = await BookingRequest.find(filter)
    .populate('property', 'title city price status')
    .populate('agent', 'firstname lastname email phone')
    .sort({ createdAt: -1 })

  sendSuccessResponse(res, { bookingRequests }, 'Booking requests fetched successfully')
})

export const getAgentBookingRequests = asyncHandler(async (req, res) => {
  const { status } = req.query
  const filter = req.user.role === 'admin' ? {} : { agent: req.user.id }

  if (status) {
    filter.status = status
  }

  const bookingRequests = await BookingRequest.find(filter)
    .populate('property', 'title city price status')
    .populate('buyer', 'firstname lastname email phone')
    .sort({ createdAt: -1 })

  sendSuccessResponse(res, { bookingRequests }, 'Booking requests fetched successfully')
})

export const cancelBookingRequest = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  const bookingRequest = await BookingRequest.findById(id).populate('property', 'status title')
  if (!bookingRequest) {
    throw new AppError('Booking request not found', 404)
  }

  const isAdmin = req.user.role === 'admin'
  const isAssignedAgent = bookingRequest.agent.toString() === req.user.id

  if (!isAdmin && !isAssignedAgent) {
    throw new AppError('Unauthorized to cancel this booking request', 403)
  }

  if (bookingRequest.status !== 'pending') {
    throw new AppError('Only pending booking requests can be cancelled', 400)
  }

  bookingRequest.status = 'cancelled'
  bookingRequest.cancelReason = reason || 'Cancelled by agent/admin'
  await bookingRequest.save()

  try {
    const buyerUser = await User.findById(bookingRequest.buyer).select('email firstname lastname')
    if (buyerUser?.email) {
      await createNotification(bookingRequest.buyer, {
        type: 'booking_request_cancelled',
        title: 'Booking Token Request Cancelled',
        message: `Your booking token request for ${bookingRequest.property?.title || 'a property'} was cancelled`,
        data: {
          bookingRequestId: bookingRequest._id,
          propertyId: bookingRequest.property,
          actionUrl: '/buyer/booking-requests',
        },
      })

      await sendBookingPaymentStatusEmail(buyerUser.email, {
        status: 'cancelled',
        buyerName: `${buyerUser.firstname || ''} ${buyerUser.lastname || ''}`.trim() || 'Buyer',
        propertyTitle: bookingRequest.property?.title || 'Property',
        tokenAmount: bookingRequest.tokenAmount,
      })
    }
  } catch (emailError) {
    console.error('Error sending booking cancellation email:', emailError.message)
  }

  sendSuccessResponse(res, bookingRequest, 'Booking request cancelled successfully')
})

export const markBookingRefunded = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  const bookingRequest = await BookingRequest.findById(id).populate('property', 'title status')
  if (!bookingRequest) {
    throw new AppError('Booking request not found', 404)
  }

  const isAdmin = req.user.role === 'admin'
  const isAssignedAgent = bookingRequest.agent.toString() === req.user.id

  if (!isAdmin && !isAssignedAgent) {
    throw new AppError('Unauthorized to mark refund for this booking request', 403)
  }

  if (bookingRequest.status !== 'paid') {
    throw new AppError('Only paid booking requests can be marked refunded', 400)
  }

  bookingRequest.status = 'refunded'
  bookingRequest.refundedAt = new Date()
  bookingRequest.refundReason = reason || 'Refund marked by agent/admin'
  await bookingRequest.save()

  await Property.findByIdAndUpdate(bookingRequest.property, {
    $set: { status: 'active' },
  })

  try {
    const buyerUser = await User.findById(bookingRequest.buyer).select('email firstname lastname')
    if (buyerUser?.email) {
      await createNotification(bookingRequest.buyer, {
        type: 'booking_request_refunded',
        title: 'Booking Token Refunded',
        message: `Your booking token for ${bookingRequest.property?.title || 'a property'} was refunded`,
        data: {
          bookingRequestId: bookingRequest._id,
          propertyId: bookingRequest.property,
          actionUrl: '/buyer/booking-requests',
        },
      })

      await sendBookingPaymentStatusEmail(buyerUser.email, {
        status: 'refunded',
        buyerName: `${buyerUser.firstname || ''} ${buyerUser.lastname || ''}`.trim() || 'Buyer',
        propertyTitle: bookingRequest.property?.title || 'Property',
        tokenAmount: bookingRequest.tokenAmount,
      })
    }
  } catch (emailError) {
    console.error('Error sending booking refund email:', emailError.message)
  }

  sendSuccessResponse(res, bookingRequest, 'Booking request marked refunded successfully')
})

export const completeBookingRequest = asyncHandler(async (req, res) => {
  const { id } = req.params

  const bookingRequest = await BookingRequest.findById(id)
  if (!bookingRequest) {
    throw new AppError('Booking request not found', 404)
  }

  const isAdmin = req.user.role === 'admin'
  const isAssignedAgent = bookingRequest.agent.toString() === req.user.id

  if (!isAdmin && !isAssignedAgent) {
    throw new AppError('Unauthorized to complete this booking request', 403)
  }

  if (bookingRequest.status !== 'paid') {
    throw new AppError('Only paid booking requests can be completed', 400)
  }

  const property = await Property.findById(bookingRequest.property).select('status title')
  if (!property) {
    throw new AppError('Property not found', 404)
  }

  if (property.status !== 'on_hold') {
    throw new AppError('Property must be on_hold before marking sold', 400)
  }

  bookingRequest.status = 'completed'
  bookingRequest.completedAt = new Date()
  await bookingRequest.save()

  property.status = 'sold'
  await property.save()

  try {
    const buyerUser = await User.findById(bookingRequest.buyer).select('email firstname lastname')
    const agentUser = await User.findById(bookingRequest.agent).select('email firstname lastname')

    if (buyerUser?.email) {
      await createNotification(bookingRequest.buyer, {
        type: 'booking_request_completed',
        title: 'Property Marked Sold',
        message: `Your booking for ${property.title || 'the property'} has been completed`,
        data: {
          bookingRequestId: bookingRequest._id,
          propertyId: bookingRequest.property,
          actionUrl: '/buyer/booking-requests',
        },
      })

      await sendBookingPaymentStatusEmail(buyerUser.email, {
        status: 'completed',
        buyerName: `${buyerUser.firstname || ''} ${buyerUser.lastname || ''}`.trim() || 'Buyer',
        propertyTitle: property.title || 'Property',
        tokenAmount: bookingRequest.tokenAmount,
      })
    }

    if (agentUser?.email) {
      await createNotification(bookingRequest.agent, {
        type: 'booking_request_completed',
        title: 'Booking Completed',
        message: `Booking for property has been completed`,
        data: {
          bookingRequestId: bookingRequest._id,
          propertyId: bookingRequest.property,
          actionUrl: '/agent/booking-requests',
        },
      })
    }
  } catch (emailError) {
    console.error('Error sending booking completion email:', emailError.message)
  }

  sendSuccessResponse(res, bookingRequest, 'Booking completed and property marked sold')
})

export const expireBookingRequests = asyncHandler(async (req, res) => {
  const expiredRequests = await BookingRequest.find({
    status: 'pending',
    expiresAt: { $lte: new Date() },
  }).select('_id')

  if (expiredRequests.length === 0) {
    sendSuccessResponse(res, { updated: 0 }, 'No booking requests to expire')
    return
  }

  const ids = expiredRequests.map((item) => item._id)

  await BookingRequest.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'expired' } }
  )

  sendSuccessResponse(res, { updated: ids.length }, 'Expired pending booking requests')
})
