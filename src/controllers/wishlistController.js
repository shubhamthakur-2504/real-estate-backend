import Wishlist from '../models/Wishlist.js'
import Property from '../models/Property.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'

// Get buyer's wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query
  const skip = (page - 1) * limit

  const total = await Wishlist.countDocuments({ buyer: req.user.id })

  const wishlist = await Wishlist.find({ buyer: req.user.id })
    .populate('property', 'title address city price bedrooms bathrooms propertyArea propertyType images status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      wishlist,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    },
    'Wishlist retrieved successfully'
  )
})

// Check if property is in wishlist
export const checkWishlist = asyncHandler(async (req, res) => {
  const { propertyId } = req.params

  const item = await Wishlist.findOne({
    buyer: req.user.id,
    property: propertyId,
  })

  sendSuccessResponse(res, { isInWishlist: !!item }, 'Wishlist check complete')
})

// Add to wishlist
export const addToWishlist = asyncHandler(async (req, res) => {
  const { propertyId } = req.params
  const { note } = req.body

  // Check if property exists
  const property = await Property.findById(propertyId)
  if (!property) {
    throw new AppError('Property not found', 404)
  }

  // Check if already in wishlist
  const existingItem = await Wishlist.findOne({
    buyer: req.user.id,
    property: propertyId,
  })

  if (existingItem) {
    throw new AppError('This property is already in your wishlist', 400)
  }

  // Add to wishlist
  const wishlistItem = await Wishlist.create({
    buyer: req.user.id,
    property: propertyId,
    note: note || '',
  })

  await wishlistItem.populate('property', 'title address city price bedrooms bathrooms propertyArea propertyType images')

  sendSuccessResponse(res, wishlistItem, 'Property added to wishlist', 201)
})

// Remove from wishlist
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { propertyId } = req.params

  const wishlistItem = await Wishlist.findOneAndDelete({
    buyer: req.user.id,
    property: propertyId,
  })

  if (!wishlistItem) {
    throw new AppError('This property is not in your wishlist', 404)
  }

  sendSuccessResponse(res, null, 'Property removed from wishlist')
})

// Update wishlist note
export const updateWishlistNote = asyncHandler(async (req, res) => {
  const { propertyId } = req.params
  const { note } = req.body

  const wishlistItem = await Wishlist.findOneAndUpdate(
    {
      buyer: req.user.id,
      property: propertyId,
    },
    { note },
    { new: true }
  ).populate('property', 'title address city price bedrooms bathrooms propertyArea propertyType images')

  if (!wishlistItem) {
    throw new AppError('This property is not in your wishlist', 404)
  }

  sendSuccessResponse(res, wishlistItem, 'Wishlist note updated')
})
