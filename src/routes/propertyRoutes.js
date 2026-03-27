import express from 'express'
import {
  createProperty,
  getAllProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  searchPropertiesByLocation,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  getAgentProperties,
  getMyProperties,
  featureProperty,
  getFeaturedProperties,
  searchByNearbyFacilities,
  searchByDistance,
  addPropertyImage,
  setFeaturedImage,
  reorderPropertyImages,
  removePropertyImage,
} from '../controllers/propertyController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Public routes - specific paths first to avoid /:id matching
router.get('/featured', getFeaturedProperties)
router.get('/search-location', searchPropertiesByLocation)
router.get('/search-facilities', searchByNearbyFacilities)  // e.g., ?facilityType=metro&maxDistance=2
router.get('/search-distance', searchByDistance)            // e.g., ?distanceField=distanceToRailway&maxDistance=5

// Protected specific paths (before /:id)
router.get('/favorites/my', authMiddleware, getUserFavorites)
router.get('/agent/my', authMiddleware, getMyProperties)

// General routes
router.get('/', getAllProperties)
router.post('/', authMiddleware, createProperty)

// ID-based routes (after specific paths)
router.get('/:id', getProperty)
router.put('/:id', authMiddleware, updateProperty)
router.delete('/:id', authMiddleware, deleteProperty)
router.post('/:id/favorite', authMiddleware, addToFavorites)
router.delete('/:id/favorite', authMiddleware, removeFromFavorites)
router.post('/:id/feature', authMiddleware, featureProperty)

// Image management routes
router.post('/:propertyId/images/add', authMiddleware, addPropertyImage)
router.post('/:propertyId/images/featured', authMiddleware, setFeaturedImage)
router.put('/:propertyId/images/reorder', authMiddleware, reorderPropertyImages)
router.delete('/:propertyId/images/remove', authMiddleware, removePropertyImage)

// Agent properties with agentId
router.get('/agent/:agentId', getAgentProperties)

export default router
