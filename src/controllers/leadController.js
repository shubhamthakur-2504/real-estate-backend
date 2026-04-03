import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'
import { sendLeadNotification, sendLeadStatusEmail, sendPropertyInquiryConfirmation } from '../services/emailService.js'
import { notifyInquiryReceived, notifyLeadStatusUpdated } from '../utils/notificationEvents.js'

// Create a new lead
export const createLead = asyncHandler(async (req, res) => {
  const { propertyId, buyerId, buyerName, buyerEmail, buyerPhone, budget, preferredTimeline, source, interest } = req.body

  // Validate required fields
  if (!propertyId || !buyerName || !buyerEmail || !buyerPhone) {
    throw new AppError('Please provide propertyId, buyerName, buyerEmail, and buyerPhone', 400)
  }

  console.log('=== CREATE LEAD DEBUG ===')
  console.log('Received buyerId:', buyerId)
  console.log('Authenticated user ID:', req.user?.id)
  console.log('Authenticated user role:', req.user?.role)

  // Check if property exists
  const property = await Property.findById(propertyId)
  if (!property) {
    throw new AppError('Property not found', 404)
  }

  // Check if lead already exists (same email + property)
  const existingLead = await Lead.findOne({
    buyerEmail: buyerEmail,
    property: propertyId,
  })

  if (existingLead) {
    throw new AppError('A lead with this email already exists for this property', 400)
  }

  // For authenticated buyers, use their user ID if not explicitly provided
  const finalBuyerId = buyerId || (req.user?.role === 'buyer' ? req.user.id : null)
  const finalStatus = finalBuyerId ? 'interested' : 'new'
  
  console.log('Final buyerId to save:', finalBuyerId)
  console.log('Final status:', finalStatus)
  
  const lead = await Lead.create({
    property: propertyId,
    buyer: finalBuyerId, // Set buyer if authenticated buyer or provided
    agent: property.agent, // Auto-assign to property's agent
    buyerName,
    buyerEmail,
    buyerPhone,
    budget,
    preferredTimeline,
    source: source || 'property_page',
    interest: interest || 'medium',
    isWarmLead: req.body.isWarmLead || false,
    status: finalStatus,
  })
  
  console.log('Lead created - ID:', lead._id, 'Buyer:', lead.buyer, 'Status:', lead.status)

  // Populate references
  await lead.populate('property', 'title address city price type')
  await lead.populate('agent', 'firstname lastname email phone')

  // Send in-app notification to agent about new inquiry (non-blocking)
  try {
    await notifyInquiryReceived(lead.agent._id, {
      leadId: lead._id,
      propertyId: lead.property._id,
      propertyTitle: lead.property.title,
      buyerName: lead.buyerName,
    })
  } catch (notificationError) {
    console.error('Error sending in-app notification:', notificationError.message)
  }

  // Send email notifications (non-blocking)
  try {
    // Notify agent of new lead assignment
    const agentEmailData = {
      leadId: lead._id,
      propertyTitle: lead.property.title,
      propertyCity: lead.property.city,
      propertyPrice: lead.property.price,
      buyerName: lead.buyerName,
      buyerEmail: lead.buyerEmail,
      buyerPhone: lead.buyerPhone,
      budget: lead.budget,
      preferredTimeline: lead.preferredTimeline,
      interest: lead.interest,
    }
    await sendLeadNotification(lead.agent.email, agentEmailData)
  } catch (emailError) {
    // Log error but don't fail the lead creation
    console.error('Error sending lead notification email to agent:', emailError.message)
  }

  sendSuccessResponse(
    res,
    lead,
    'Lead created successfully and notifications sent to agent and buyer',
    201
  )
})

// Get single lead
export const getLead = asyncHandler(async (req, res) => {
  const { id } = req.params

  const lead = await Lead.findById(id)
    .populate('property', 'title address city price bedrooms bathrooms')
    .populate('agent', 'firstname lastname email phone avatar')
    .populate('notes.agentId', 'firstname lastname')

  if (!lead) {
    throw new AppError('Lead not found', 404)
  }

  sendSuccessResponse(res, lead, 'Lead retrieved successfully')
})

// Get all leads (with filters)
export const getAllLeads = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, interest, source } = req.query

  const skip = (page - 1) * limit
  const filter = {}

  // Enforce tenant scoping: agents only see their assigned leads.
  // Admins can view all leads.
  if (req.user?.role === 'agent') {
    filter.agent = req.user.id
  }

  if (status) filter.status = status
  if (interest) filter.interest = interest
  if (source) filter.source = source

  const total = await Lead.countDocuments(filter)

  const leads = await Lead.find(filter)
    .populate('property', 'title address city price')
    .populate('agent', 'firstname lastname email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      leads,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalLeads: total,
        leadsPerPage: Number(limit),
      },
    },
    'Leads retrieved successfully'
  )
})

// Get agent's leads
export const getAgentLeads = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query

  // Only agents and admins can view leads
  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    throw new AppError('Only agents can view leads', 403)
  }

  const skip = (page - 1) * limit
  const filter = { agent: req.user.id }

  if (status) filter.status = status

  const total = await Lead.countDocuments(filter)

  const leads = await Lead.find(filter)

    .populate('property', 'title address city price bedrooms bathrooms')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      leads,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalLeads: total,
      },
    },
    'Your leads retrieved successfully'
  )
})

// Get buyer's leads
export const getBuyerLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query

  const skip = (page - 1) * limit
  
  // Create filter that matches either by buyer ID or by buyer email
  const filter = {
    $or: [
      { buyer: req.user.id },
      { buyerEmail: req.user.email }
    ]
  }

  if (status) filter.status = status

  const total = await Lead.countDocuments(filter)
  console.log('Fetching buyer leads for user:', req.user.id, 'email:', req.user.email, 'Total found:', total)

  const leads = await Lead.find(filter)
    .populate('property', 'title address city price bedrooms bathrooms propertyArea propertyType images')
    .populate('buyer', 'firstname lastname email phone')
    .populate('agent', 'firstname lastname email phone avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  if (leads.length > 0) {
    console.log('Sample lead - ID:', leads[0]._id, 'Status:', leads[0].status, 'BuyerID:', leads[0].buyer)
  }

  sendSuccessResponse(
    res,
    {
      leads,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalLeads: total,
      },
    },
    'Buyer leads retrieved successfully'
  )
})

// Get leads for a specific property
export const getPropertyLeads = asyncHandler(async (req, res) => {
  const { propertyId } = req.params
  const { status, page = 1, limit = 10 } = req.query

  // Check if property exists
  const property = await Property.findById(propertyId)
  if (!property) {
    throw new AppError('Property not found', 404)
  }

  // Check authorization (property owner or admin)
  if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to view these leads', 403)
  }

  const skip = (page - 1) * limit
  const filter = { property: propertyId }

  if (status) filter.status = status

  const total = await Lead.countDocuments(filter)

  const leads = await Lead.find(filter)
    .populate('agent', 'firstname lastname email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      leads,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalLeads: total,
      },
    },
    'Property leads retrieved successfully'
  )
})

// Update lead status
export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, agentMessage } = req.body

  if (!status) {
    throw new AppError('Please provide status', 400)
  }

  const lead = await Lead.findById(id)

  if (!lead) {
    throw new AppError('Lead not found', 404)
  }

  // Check authorization (agent who owns the lead, buyer who created it, buyer by email fallback, or admin)
  const isAgent = lead.agent?.toString() === req.user.id
  const isBuyer = lead.buyer?.toString() === req.user.id
  const isBuyerByEmail = !!req.user.email && lead.buyerEmail === req.user.email
  const isAdmin = req.user.role === 'admin'
  
  if (!isAgent && !isBuyer && !isBuyerByEmail && !isAdmin) {
    throw new AppError('You are not authorized to update this lead', 403)
  }

  const oldStatus = lead.status
  lead.status = status
  lead.lastContactedAt = new Date()

  // If converted, set convertedAt timestamp
  if (status === 'converted') {
    lead.convertedAt = new Date()
  }

  await lead.save()

  // Populate to get full data for email and response
  await lead.populate('property', 'title address city price bedrooms bathrooms')
  await lead.populate('agent', 'firstname lastname email phone avatar')
  await lead.populate('notes.agentId', 'firstname lastname')

  // Send in-app notification to buyer about status update (non-blocking)
  try {
    if (lead.buyer) {
      await notifyLeadStatusUpdated(lead.buyer._id, {
        leadId: lead._id,
        propertyId: lead.property._id,
        propertyTitle: lead.property.title,
        status: lead.status,
      })
    }
  } catch (notificationError) {
    console.error('Error sending status update notification:', notificationError.message)
  }

  // Send status update email to buyer (non-blocking)
  try {
    const statusEmailData = {
      buyerName: lead.buyerName,
      propertyTitle: lead.property.title,
      status: lead.status,
      agentMessage: agentMessage || '',
    }
    await sendLeadStatusEmail(lead.buyerEmail, statusEmailData)
  } catch (emailError) {
    console.error('Error sending status update email:', emailError.message)
  }

  sendSuccessResponse(res, lead, `Lead status updated from ${oldStatus} to ${status}`)
})

// Add note to lead
export const addNoteToLead = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { message } = req.body

  if (!message) {
    throw new AppError('Please provide a note message', 400)
  }

  const lead = await Lead.findById(id)

  if (!lead) {
    throw new AppError('Lead not found', 404)
  }

  // Check authorization (agent or admin)
  if (lead.agent?.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to add notes to this lead', 403)
  }

  lead.notes.push({
    agentId: req.user.id,
    message,
  })

  lead.lastContactedAt = new Date()
  await lead.save()

  await lead.populate('property', 'title address city price bedrooms bathrooms')
  await lead.populate('agent', 'firstname lastname email phone avatar')
  await lead.populate('notes.agentId', 'firstname lastname')

  sendSuccessResponse(res, lead, 'Note added successfully')
})

// Update lead (full update)
export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = { ...req.body }

  console.log('\n=== UPDATE LEAD DEBUG ===')
  console.log('Lead ID:', id)
  console.log('User ID:', req.user.id)
  console.log('User Role:', req.user.role)
  console.log('Update Data:', updateData)

  const lead = await Lead.findById(id)

  if (!lead) {
    throw new AppError('Lead not found', 404)
  }

  console.log('Lead found:')
  console.log('  - Lead.buyer:', lead.buyer)
  console.log('  - Lead.agent:', lead.agent)
  console.log('  - Lead.status:', lead.status)

  // Check authorization (agent who owns the lead, buyer who created it, buyer by email fallback, or admin)
  const isAgent = lead.agent?.toString() === req.user.id
  const isBuyer = lead.buyer?.toString() === req.user.id
  const isBuyerByEmail = !!req.user.email && lead.buyerEmail === req.user.email
  const isAdmin = req.user.role === 'admin'
  
  console.log('Authorization:')
  console.log('  - isAgent:', isAgent, '(lead.agent:', lead.agent?.toString(), 'vs user:', req.user.id, ')')
  console.log('  - isBuyer:', isBuyer, '(lead.buyer:', lead.buyer?.toString(), 'vs user:', req.user.id, ')')
  console.log('  - isBuyerByEmail:', isBuyerByEmail, '(lead.buyerEmail:', lead.buyerEmail, 'vs user.email:', req.user.email, ')')
  console.log('  - isAdmin:', isAdmin)
  
  if (!isAgent && !isBuyer && !isBuyerByEmail && !isAdmin) {
    console.log('UNAUTHORIZED - Throwing 403')
    throw new AppError('You are not authorized to update this lead', 403)
  }
  
  console.log('AUTHORIZED - Proceeding with update')
  
  // Buyers can only update status to specific values (not 'new')
  if ((isBuyer || isBuyerByEmail) && !isAgent && !isAdmin) {
    const buyerAllowedStatuses = ['interested', 'viewing', 'negotiating']
    if (updateData.status && !buyerAllowedStatuses.includes(updateData.status)) {
      throw new AppError('You can only set status to: interested, viewing, or negotiating', 403)
    }
    // Only allow buyers to update status field
    const buyerAllowedFields = ['status']
    Object.keys(updateData).forEach((key) => {
      if (!buyerAllowedFields.includes(key)) {
        delete updateData[key]
      }
    })
  }

  // Allowed fields to update
  const allowedFields = [
    'status',
    'budget',
    'preferredTimeline',
    'interest',
    'nextFollowupDate',
    'viewingScheduledDate',
    'isWarmLead',
  ]

  // Normalize empty form values to avoid enum/date/number validation errors
  if (updateData.preferredTimeline === '') {
    updateData.preferredTimeline = undefined
  }
  if (updateData.nextFollowupDate === '') {
    updateData.nextFollowupDate = undefined
  }
  if (updateData.viewingScheduledDate === '') {
    updateData.viewingScheduledDate = undefined
  }
  if (updateData.budget === '') {
    updateData.budget = undefined
  }

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      lead[key] = updateData[key]
    }
  })

  lead.lastContactedAt = new Date()
  await lead.save()

  await lead.populate('property', 'title address city price bedrooms bathrooms')
  await lead.populate('agent', 'firstname lastname email phone avatar')
  await lead.populate('notes.agentId', 'firstname lastname')

  sendSuccessResponse(res, lead, 'Lead updated successfully')
})

// Delete lead
export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params

  const lead = await Lead.findById(id)

  if (!lead) {
    throw new AppError('Lead not found', 404)
  }

  // Check authorization (agent who owns the lead, buyer, or admin)
  if (
    lead.agent?.toString() !== req.user.id &&
    lead.buyer.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw new AppError('You are not authorized to delete this lead', 403)
  }

  await Lead.findByIdAndDelete(id)

  sendSuccessResponse(res, {}, 'Lead deleted successfully')
})

// Assign lead to agent
export const assignLead = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { agentId } = req.body

  if (!agentId) {
    throw new AppError('Please provide agentId', 400)
  }

  const lead = await Lead.findById(id)

  if (!lead) {
    throw new AppError('Lead not found', 404)
  }

  // Check authorization (admin or property owner)
  if (req.user.role !== 'admin') {
    throw new AppError('Only admins can assign leads', 403)
  }

  lead.agent = agentId
  await lead.save()

  await lead.populate('agent', 'firstname lastname email')

  sendSuccessResponse(res, lead, 'Lead assigned successfully')
})
