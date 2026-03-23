import Property from '../models/Property.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'
import { geocodeAddress } from '../utils/geocoding.js'

// Create property
export const createProperty = asyncHandler(async (req, res) => {
  const { 
    title, description, address, city, state, zipcode, propertyType, price, 
    bedrooms, bathrooms, propertyArea, amenities, 
    nearbyFacilities, highlights, distanceToRailway, distanceToAirport, distanceToHospital, distanceToSchool, distanceToMetro,
    coordinates 
  } = req.body

  // Validate required fields
  if (!title || !address || !city || !propertyType || !price) {
    throw new AppError('Please provide title, address, city, propertyType, and price', 400)
  }

  // Validate user role (only agents and admins can create properties)
  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    throw new AppError('Only agents and admins can create properties', 403)
  }

  let finalCoordinates = coordinates

  // If no coordinates provided, geocode the address
  if (!coordinates) {
    finalCoordinates = await geocodeAddress(address, city, state, zipcode)
  } else {
    // Validate coordinates format if provided
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new AppError('Coordinates must be [longitude, latitude]', 400)
    }
  }

  const property = await Property.create({
    title,
    description,
    owner: req.user.id,
    agent: req.user.role === 'agent' ? req.user.id : undefined,
    address,
    city,
    state,
    zipcode,
    propertyType,
    price,
    bedrooms,
    bathrooms,
    propertyArea,
    amenities: amenities || [],
    nearbyFacilities: nearbyFacilities || [],
    highlights: highlights || [],
    distanceToRailway,
    distanceToAirport,
    distanceToHospital,
    distanceToSchool,
    distanceToMetro,
    location: {
      type: 'Point',
      coordinates: finalCoordinates,
    },
  })

  sendSuccessResponse(
    res,
    property,
    'Property created successfully',
    201
  )
})

// Get all properties with filters and pagination
export const getAllProperties = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, city, propertyType, minPrice, maxPrice, status = 'active' } = req.query

  const skip = (page - 1) * limit

  // Build filter object
  const filter = { status }

  if (city) {
    filter.city = { $regex: city, $options: 'i' } // Case-insensitive search
  }

  if (propertyType) {
    filter.propertyType = propertyType
  }

  if (minPrice || maxPrice) {
    filter.price = {}
    if (minPrice) filter.price.$gte = Number(minPrice)
    if (maxPrice) filter.price.$lte = Number(maxPrice)
  }

  const total = await Property.countDocuments(filter)
  const properties = await Property.find(filter)
    .populate('owner', 'firstname lastname email phone avatar')
    .populate('agent', 'firstname lastname email phone avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProperties: total,
        propertiesPerPage: Number(limit),
      },
    },
    'Properties retrieved successfully'
  )
})

// Get single property
export const getProperty = asyncHandler(async (req, res) => {
  const { id } = req.params

  const property = await Property.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } }, // Increment views
    { new: true }
  )
    .populate('owner', 'firstname lastname email phone avatar bio role')
    .populate('agent', 'firstname lastname email phone avatar bio')
    .populate('favorites', 'firstname lastname email')

  if (!property) {
    throw new AppError('Property not found', 404)
  }

  sendSuccessResponse(
    res,
    property,
    'Property retrieved successfully'
  )
})

// Update property
export const updateProperty = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = req.body

  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Property not found', 404)
  }

  // Check authorization (owner or admin only)
  if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to update this property', 403)
  }

  // Handle coordinates: if address fields changed, re-geocode
  if (updateData.address || updateData.city || updateData.state || updateData.zipcode) {
    const addressToGeocode = updateData.address || property.address
    const cityToGeocode = updateData.city || property.city
    const stateToGeocode = updateData.state || property.state
    const zipcodeToGeocode = updateData.zipcode || property.zipcode

    const newCoordinates = await geocodeAddress(addressToGeocode, cityToGeocode, stateToGeocode, zipcodeToGeocode)
    updateData.location = {
      type: 'Point',
      coordinates: newCoordinates,
    }
  } else if (updateData.coordinates) {
    // If coordinates explicitly provided
    if (!Array.isArray(updateData.coordinates) || updateData.coordinates.length !== 2) {
      throw new AppError('Coordinates must be [longitude, latitude]', 400)
    }
    updateData.location = {
      type: 'Point',
      coordinates: updateData.coordinates,
    }
  }

  delete updateData.coordinates // Remove coordinates from updateData

  // Update allowed fields
  const allowedFields = [
    'title', 'description', 'address', 'city', 'state', 'zipcode', 'price', 
    'bedrooms', 'bathrooms', 'propertyArea', 'amenities', 'status', 'featured', 'location',
    'nearbyFacilities', 'highlights', 'distanceToRailway', 'distanceToAirport', 
    'distanceToHospital', 'distanceToSchool', 'distanceToMetro'
  ]

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      property[key] = updateData[key]
    }
  })

  await property.save()

  sendSuccessResponse(
    res,
    property,
    'Property updated successfully'
  )
})

// Delete property
export const deleteProperty = asyncHandler(async (req, res) => {
  const { id } = req.params

  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Property not found', 404)
  }

  // Check authorization (owner or admin only)
  if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to delete this property', 403)
  }

  await Property.findByIdAndDelete(id)

  sendSuccessResponse(
    res,
    {},
    'Property deleted successfully'
  )
})

// Search properties by location (geospatial query)
export const searchPropertiesByLocation = asyncHandler(async (req, res) => {
  const { longitude, latitude, maxDistance = 5000 } = req.query // maxDistance in meters, default 5km

  if (!longitude || !latitude) {
    throw new AppError('Please provide longitude and latitude', 400)
  }

  const properties = await Property.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        },
        $maxDistance: Number(maxDistance),
      },
    },
    status: 'active',
  })
    .populate('owner', 'firstname lastname email phone avatar')
    .populate('agent', 'firstname lastname email phone avatar')
    .limit(20)

  sendSuccessResponse(
    res,
    properties,
    'Properties retrieved successfully'
  )
})

// Add property to favorites
export const addToFavorites = asyncHandler(async (req, res) => {
  const { id } = req.params

  const property = await Property.findByIdAndUpdate(
    id,
    { $addToSet: { favorites: req.user.id } }, // $addToSet prevents duplicates
    { new: true }
  )

  if (!property) {
    throw new AppError('Property not found', 404)
  }

  sendSuccessResponse(
    res,
    property,
    'Added to favorites'
  )
})

// Remove from favorites
export const removeFromFavorites = asyncHandler(async (req, res) => {
  const { id } = req.params

  const property = await Property.findByIdAndUpdate(
    id,
    { $pull: { favorites: req.user.id } },
    { new: true }
  )

  if (!property) {
    throw new AppError('Property not found', 404)
  }

  sendSuccessResponse(
    res,
    property,
    'Removed from favorites'
  )
})

// Get user's favorite properties
export const getUserFavorites = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  const skip = (page - 1) * limit

  const total = await Property.countDocuments({ favorites: req.user.id })

  const properties = await Property.find({ favorites: req.user.id })
    .populate('owner', 'firstname lastname email phone avatar')
    .populate('agent', 'firstname lastname email phone avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProperties: total,
      },
    },
    'Favorite properties retrieved successfully'
  )
})

// Get agent's properties
export const getAgentProperties = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  // Can get own properties or admin can get any agent's properties
  const agentId = req.params.agentId || req.user.id

  if (req.user.id !== agentId && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to view these properties', 403)
  }

  const skip = (page - 1) * limit

  const total = await Property.countDocuments({ agent: agentId })

  const properties = await Property.find({ agent: agentId })
    .populate('owner', 'firstname lastname email phone avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProperties: total,
      },
    },
    'Agent properties retrieved successfully'
  )
})

// Get my properties (authenticated agent)
export const getMyProperties = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    throw new AppError('Only agents can view their properties', 403)
  }

  const skip = (page - 1) * limit

  const total = await Property.countDocuments({ agent: req.user.id })

  const properties = await Property.find({ agent: req.user.id })
    .populate('owner', 'firstname lastname email phone avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProperties: total,
      },
    },
    'Your properties retrieved successfully'
  )
})

// Feature a property (admin/agent only)
export const featureProperty = asyncHandler(async (req, res) => {
  const { id } = req.params

  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    throw new AppError('Only admins and agents can feature properties', 403)
  }

  const property = await Property.findByIdAndUpdate(
    id,
    { featured: true },
    { new: true }
  )

  if (!property) {
    throw new AppError('Property not found', 404)
  }

  sendSuccessResponse(
    res,
    property,
    'Property featured successfully'
  )
})

// Get featured properties
export const getFeaturedProperties = asyncHandler(async (req, res) => {
  const { limit = 6 } = req.query

  const properties = await Property.find({ featured: true, status: 'active' })
    .populate('owner', 'firstname lastname email phone avatar')
    .populate('agent', 'firstname lastname email phone avatar')
    .sort({ createdAt: -1 })
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    properties,
    'Featured properties retrieved successfully'
  )
})

// Search properties by nearby facilities (e.g., "near hospital", "near metro")
export const searchByNearbyFacilities = asyncHandler(async (req, res) => {
  const { facilityType, maxDistance = 2, page = 1, limit = 10 } = req.query

  // Valid facility types
  const validTypes = ['hospital', 'school', 'railway', 'airport', 'metro', 'market', 'park', 'mall', 'bus stop', 'college']

  if (!facilityType || !validTypes.includes(facilityType)) {
    throw new AppError(`Facility type must be one of: ${validTypes.join(', ')}`, 400)
  }

  const skip = (page - 1) * limit

  // Find properties that have this facility type within maxDistance
  const total = await Property.countDocuments({
    status: 'active',
    nearbyFacilities: {
      $elemMatch: {
        type: facilityType,
        distance: { $lte: Number(maxDistance) },
      },
    },
  })

  const properties = await Property.find({
    status: 'active',
    nearbyFacilities: {
      $elemMatch: {
        type: facilityType,
        distance: { $lte: Number(maxDistance) },
      },
    },
  })
    .populate('owner', 'firstname lastname email phone avatar')
    .populate('agent', 'firstname lastname email phone avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProperties: total,
        propertiesPerPage: Number(limit),
      },
    },
    `Properties found near ${facilityType}`
  )
})

// Get properties sorted by distance to a facility
export const searchByDistance = asyncHandler(async (req, res) => {
  const { distanceField, maxDistance, page = 1, limit = 10 } = req.query

  // Valid distance fields
  const validFields = [
    'distanceToRailway',
    'distanceToAirport',
    'distanceToHospital',
    'distanceToSchool',
    'distanceToMetro',
  ]

  if (!distanceField || !validFields.includes(distanceField)) {
    throw new AppError(`Distance field must be one of: ${validFields.join(', ')}`, 400)
  }

  if (!maxDistance) {
    throw new AppError('Please provide maxDistance in km', 400)
  }

  const skip = (page - 1) * limit

  // Build filter object
  const filter = {
    status: 'active',
    [distanceField]: { $lte: Number(maxDistance), $exists: true, $ne: null },
  }

  const total = await Property.countDocuments(filter)

  const properties = await Property.find(filter)
    .populate('owner', 'firstname lastname email phone avatar')
    .populate('agent', 'firstname lastname email phone avatar')
    .sort({ [distanceField]: 1 }) // Sort by distance ascending
    .skip(skip)
    .limit(Number(limit))

  sendSuccessResponse(
    res,
    {
      properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProperties: total,
      },
    },
    `Properties retrieved sorted by ${distanceField}`
  )
})
