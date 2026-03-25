import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'
import { sendLeadNotification, sendLeadStatusEmail, sendPropertyInquiryConfirmation } from '../services/emailService.js'

// Create a new lead
export const createLead = asyncHandler(async (req, res) => {
  const { propertyId, buyerName, buyerEmail, buyerPhone, budget, preferredTimeline, source, interest } = req.body

  // Validate required fields
  if (!propertyId || !buyerName || !buyerEmail || !buyerPhone) {
    throw new AppError('Please provide propertyId, buyerName, buyerEmail, and buyerPhone', 400)
  }

  // Check if property exists
  const property = await Property.findById(propertyId)
  if (!property) {
    throw new AppError('Property not found', 404)
  }

  // Check if lead already exists (same buyer + property)
  const existingLead = await Lead.findOne({
    buyer: req.user.id,
    property: propertyId,
  })

  if (existingLead) {
    throw new AppError('You have already created a lead for this property', 400)
  }

  // Create lead - will be assigned to property's agent
  const lead = await Lead.create({
    buyer: req.user.id,
    property: propertyId,
    agent: property.agent, // Auto-assign to property's agent
    buyerName,
    buyerEmail,
    buyerPhone,
    budget,
    preferredTimeline,
    source: source || 'property_page',
    interest: interest || 'medium',
    isWarmLead: req.body.isWarmLead || false,
  })

  // Populate references
  await lead.populate('buyer', 'firstname lastname email phone')
  await lead.populate('property', 'title address city price type')
  await lead.populate('agent', 'firstname lastname email phone')

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

    // Send confirmation email to buyer
    const propertyData = {
      title: lead.property.title,
      address: lead.property.address,
      city: lead.property.city,
      price: lead.property.price,
      type: lead.property.type,
    }
    await sendPropertyInquiryConfirmation(buyerEmail, buyerName, propertyData)
  } catch (emailError) {
    // Log error but don't fail the lead creation
    console.error('Error sending lead notification emails:', emailError.message)
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
    .populate('buyer', 'firstname lastname email phone avatar')
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

  if (status) filter.status = status
  if (interest) filter.interest = interest
  if (source) filter.source = source

  const total = await Lead.countDocuments(filter)

  const leads = await Lead.find(filter)
    .populate('buyer', 'firstname lastname email phone')
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
    .populate('buyer', 'firstname lastname email phone')
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
  const filter = { buyer: req.user.id }

  if (status) filter.status = status

  const total = await Lead.countDocuments(filter)

  const leads = await Lead.find(filter)
    .populate('property', 'title address city price bedrooms bathrooms images')
    .populate('agent', 'firstname lastname email phone avatar')
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
    .populate('buyer', 'firstname lastname email phone')
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

  // Check authorization (agent or admin)
  if (lead.agent?.toString() !== req.user.id && req.user.role !== 'admin') {
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

  // Populate to get full data for email
  await lead.populate('buyer', 'firstname lastname email phone')
  await lead.populate('property', 'title address city')

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

  await lead.populate('notes.agentId', 'firstname lastname')

  sendSuccessResponse(res, lead, 'Note added successfully')
})

// Update lead (full update)
export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = req.body

  const lead = await Lead.findById(id)

  if (!lead) {
    throw new AppError('Lead not found', 404)
  }

  // Check authorization (agent who owns the lead or admin)
  if (lead.agent?.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to update this lead', 403)
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

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      lead[key] = updateData[key]
    }
  })

  lead.lastContactedAt = new Date()
  await lead.save()

  await lead.populate('buyer', 'firstname lastname email')
  await lead.populate('property', 'title address')
  await lead.populate('agent', 'firstname lastname')

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
