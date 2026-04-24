import mongoose from 'mongoose'

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: String,
    zipcode: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    propertyType: {
      type: String,
      enum: ['residential', 'commercial', 'land'],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    bedrooms: Number,
    bathrooms: Number,
    propertyArea: Number,
    amenities: [String],
    // Nearby facilities with distances (what makes it attractive)
    nearbyFacilities: [
      {
        name: String,                    // e.g., "Apollo Hospital", "Delhi Metro Station"
        type: {
          type: String,
          enum: ['hospital', 'school', 'railway', 'airport', 'metro', 'market', 'park', 'mall', 'bus stop', 'college'],
        },
        distance: Number,                // Distance in km
        _id: false,
      },
    ],
    // Quick highlights for why to buy this property
    highlights: [String],               // e.g., ["Near Metro Station", "Prime Location", "Gated Community"]
    // Approximate distances to key landmarks (for quick filtering)
    distanceToRailway: Number,          // in km
    distanceToAirport: Number,          // in km
    distanceToHospital: Number,         // in km
    distanceToSchool: Number,           // in km
    distanceToMetro: Number,            // in km (for metro cities like Delhi, Mumbai)
    // Property images with Cloudinary integration
    images: [
      {
        url: String,
        publicId: String,               // Cloudinary public ID for deletion
        order: Number,
      },
    ],
    // Featured image (main property image)
    featuredImage: {
      url: String,
      publicId: String,                 // Cloudinary public ID for deletion
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_hold', 'sold'],
      default: 'active',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    statusBeforeDelete: {
      type: String,
      enum: ['active', 'inactive', 'on_hold', 'sold'],
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  { timestamps: true }
)

// Create geospatial index for location-based queries
propertySchema.index({ location: '2dsphere' })
propertySchema.index({ status: 1, isDeleted: 1 })

const Property = mongoose.model('Property', propertySchema)
export default Property
