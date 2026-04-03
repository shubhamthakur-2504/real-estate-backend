import express from 'express'
import {
  getWishlist,
  checkWishlist,
  addToWishlist,
  removeFromWishlist,
  updateWishlistNote,
} from '../controllers/wishlistController.js'
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// All wishlist routes require authentication and buyer role
router.use(authMiddleware, roleMiddleware('buyer'))

// Get buyer's wishlist
router.get('/', getWishlist)

// Check if property is in wishlist
router.get('/check/:propertyId', checkWishlist)

// Add to wishlist
router.post('/:propertyId', addToWishlist)

// Remove from wishlist
router.delete('/:propertyId', removeFromWishlist)

// Update wishlist note
router.put('/:propertyId', updateWishlistNote)

export default router
