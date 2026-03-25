import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema(
  {
    // Relationships
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
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Lead Status
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'viewing', 'negotiating', 'converted', 'lost'],
      default: 'new',
    },

    // Buyer Contact Details
    buyerName: {
      type: String,
      required: true,
      trim: true,
    },
    buyerEmail: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    buyerPhone: {
      type: String,
      required: true,
    },

    // Lead Details
    budget: Number, // Buyer's budget
    preferredTimeline: {
      type: String,
      enum: ['ASAP', '1-3 months', '3-6 months', '6+ months'],
    },
    
    // Interest Level
    interest: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },

    // Communication History
    notes: [
      {
        agentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        message: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Scheduling
    nextFollowupDate: Date,
    viewingScheduledDate: Date,

    // Tracking
    source: {
      type: String,
      enum: ['property_page', 'search', 'email', 'call', 'referral', 'other'],
      default: 'property_page',
    },
    lastContactedAt: Date,
    convertedAt: Date,
    isWarmLead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

// Indexes for faster queries
leadSchema.index({ agent: 1, status: 1 })
leadSchema.index({ buyer: 1 })
leadSchema.index({ property: 1 })
leadSchema.index({ createdAt: -1 })

const Lead = mongoose.model('Lead', leadSchema)
export default Lead
