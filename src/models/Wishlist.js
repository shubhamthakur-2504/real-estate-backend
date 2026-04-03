import mongoose from 'mongoose'

const wishlistSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    note: {
      type: String, // Optional note why added to wishlist
      default: '',
    },
  },
  { timestamps: true }
)

// Ensure each buyer can add each property only once
wishlistSchema.index({ buyer: 1, property: 1 }, { unique: true })
wishlistSchema.index({ buyer: 1, createdAt: -1 })

const Wishlist = mongoose.model('Wishlist', wishlistSchema)
export default Wishlist
