import express from 'express'
import {
  createProperty,
  getAllProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  restoreProperty,
  searchPropertiesByLocation,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  getAgentProperties,
  getMyProperties,
  getPropertiesCreatedByMe,
  featureProperty,
  getFeaturedProperties,
  searchByNearbyFacilities,
  searchByDistance,
  addPropertyImage,
  setFeaturedImage,
  reorderPropertyImages,
  removePropertyImage,
} from '../controllers/propertyController.js'
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Public routes - specific paths first to avoid /:id matching
router.get('/featured', getFeaturedProperties)
router.get('/search-location', searchPropertiesByLocation)
router.get('/search-facilities', searchByNearbyFacilities)  // e.g., ?facilityType=metro&maxDistance=2
router.get('/search-distance', searchByDistance)            // e.g., ?distanceField=distanceToRailway&maxDistance=5

// Protected specific paths (before /:id)
router.get('/favorites/my', authMiddleware, getUserFavorites)
router.get('/agent/my', authMiddleware, getMyProperties)
router.get('/me/created', authMiddleware, getPropertiesCreatedByMe)

// General routes
router.get('/', getAllProperties)
router.post('/', authMiddleware, roleMiddleware('agent', 'admin'), createProperty)

// ID-based routes (after specific paths)
router.get('/:id', getProperty)
router.put('/:id', authMiddleware, roleMiddleware('agent', 'admin'), updateProperty)
router.delete('/:id', authMiddleware, roleMiddleware('agent', 'admin'), deleteProperty)
router.patch('/:id/restore', authMiddleware, roleMiddleware('admin'), restoreProperty)
router.post('/:id/favorite', authMiddleware, addToFavorites)
router.delete('/:id/favorite', authMiddleware, removeFromFavorites)
router.post('/:id/feature', authMiddleware, roleMiddleware('admin'), featureProperty)

// Image management routes
router.post('/:propertyId/images/add', authMiddleware, roleMiddleware('agent', 'admin'), addPropertyImage)
router.post('/:propertyId/images/featured', authMiddleware, roleMiddleware('agent', 'admin'), setFeaturedImage)
router.put('/:propertyId/images/reorder', authMiddleware, roleMiddleware('agent', 'admin'), reorderPropertyImages)
router.delete('/:propertyId/images/remove', authMiddleware, roleMiddleware('agent', 'admin'), removePropertyImage)

// Agent properties with agentId
router.get('/agent/:agentId', getAgentProperties)

export default router
