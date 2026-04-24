import dotenv from 'dotenv'
import bcryptjs from 'bcryptjs'
import { connectDB, disconnectDB } from '../config/database.js'
import User from '../models/User.js'
import Property from '../models/Property.js'
import Lead from '../models/Lead.js'
import BookingRequest from '../models/BookingRequest.js'
import Payment from '../models/Payment.js'
import Wishlist from '../models/Wishlist.js'
import Notification from '../models/Notification.js'

dotenv.config()

const PASSWORD_PLAIN = 'Password@123'
const DEMO_AGENT_EMAIL = 'try.shubham2504@gmail.com'
const DEMO_BUYER_EMAIL = 'shubham422517@gmail.com'

const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Krishna', 'Riya', 'Ananya', 'Meera', 'Aisha', 'Diya',
  'Arjun', 'Kabir', 'Rahul', 'Neha', 'Priya', 'Sneha', 'Karan', 'Rohan', 'Sanya', 'Nisha',
]

const lastNames = [
  'Sharma', 'Verma', 'Singh', 'Patel', 'Gupta', 'Nair', 'Reddy', 'Joshi', 'Kapoor', 'Malhotra',
]

const cities = [
  {
    city: 'Delhi',
    state: 'Delhi',
    zipPrefix: '110',
    coords: [77.1025, 28.7041],
    highlights: ['Near Metro Station', 'Prime Location', 'High Rental Demand'],
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    zipPrefix: '400',
    coords: [72.8777, 19.076],
    highlights: ['Sea Facing Option', 'Business Hub Nearby', 'Excellent Connectivity'],
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    zipPrefix: '560',
    coords: [77.5946, 12.9716],
    highlights: ['IT Corridor Access', 'Gated Community', 'Growing Appreciation'],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    zipPrefix: '500',
    coords: [78.4867, 17.385],
    highlights: ['Near Tech Parks', 'Upcoming Infrastructure', 'Family Friendly Area'],
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    zipPrefix: '411',
    coords: [73.8567, 18.5204],
    highlights: ['Educational Hub', 'Balanced Lifestyle', 'Strong Resale Value'],
  },
]

const amenitiesPool = [
  'Parking', 'Lift', 'Power Backup', 'Gym', 'Swimming Pool',
  '24x7 Security', 'Garden', 'Clubhouse', 'CCTV', 'Children Play Area',
]

const propertyTypePool = ['residential', 'commercial', 'land']
const leadStatusPool = ['new', 'contacted', 'interested', 'viewing', 'negotiating', 'converted', 'lost']
const timelinePool = ['ASAP', '1-3 months', '3-6 months', '6+ months']
const interestPool = ['high', 'medium', 'low']
const sourcePool = ['property_page', 'search', 'email', 'call', 'referral', 'other']
const leadStatusWeightedPool = [
  'new', 'new', 'contacted', 'contacted', 'interested', 'interested',
  'viewing', 'negotiating', 'converted', 'lost',
]

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[rand(0, arr.length - 1)]

const pickMany = (arr, count) => {
  const copy = [...arr]
  const selected = []
  const size = Math.min(count, copy.length)
  for (let i = 0; i < size; i += 1) {
    const idx = rand(0, copy.length - 1)
    selected.push(copy[idx])
    copy.splice(idx, 1)
  }
  return selected
}

const jitterCoordinates = ([lng, lat]) => {
  const lngOffset = (Math.random() - 0.5) * 0.2
  const latOffset = (Math.random() - 0.5) * 0.2
  return [Number((lng + lngOffset).toFixed(6)), Number((lat + latOffset).toFixed(6))]
}

const makeName = () => `${pick(firstNames)} ${pick(lastNames)}`

const makePhone = () => `9${rand(100000000, 999999999)}`

const makeAddress = (city) => {
  const sector = rand(1, 99)
  const block = String.fromCharCode(65 + rand(0, 20))
  return `${rand(10, 999)}, ${block}-Block, Sector ${sector}, ${city}`
}

const makePrice = (propertyType) => {
  if (propertyType === 'land') return rand(2000000, 15000000)
  if (propertyType === 'commercial') return rand(5000000, 30000000)
  return rand(3500000, 25000000)
}

const makeArea = (propertyType) => {
  if (propertyType === 'land') return rand(800, 7000)
  if (propertyType === 'commercial') return rand(500, 5000)
  return rand(600, 4000)
}

const makeNearbyFacilities = () => {
  const facilities = [
    { name: 'City Hospital', type: 'hospital' },
    { name: 'Central School', type: 'school' },
    { name: 'Main Railway Station', type: 'railway' },
    { name: 'International Airport', type: 'airport' },
    { name: 'Metro Station', type: 'metro' },
    { name: 'Local Market', type: 'market' },
    { name: 'Public Park', type: 'park' },
    { name: 'Shopping Mall', type: 'mall' },
    { name: 'City Bus Stop', type: 'bus stop' },
    { name: 'Engineering College', type: 'college' },
  ]

  return pickMany(facilities, rand(3, 6)).map((item) => ({
    ...item,
    distance: Number((Math.random() * 8 + 0.3).toFixed(2)),
  }))
}

const residentialImagePool = [
  'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1454804/pexels-photo-1454804.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1600',
]

const commercialImagePool = [
  'https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/260931/pexels-photo-260931.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/37347/office-sitting-room-executive-sitting.jpg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg?auto=compress&cs=tinysrgb&w=1600',
]

const landImagePool = [
  'https://images.pexels.com/photos/210158/pexels-photo-210158.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/414171/pexels-photo-414171.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2480807/pexels-photo-2480807.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/326576/pexels-photo-326576.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/33109/fall-autumn-red-season.jpg?auto=compress&cs=tinysrgb&w=1600',
]

const makeImageSet = (seed, propertyType) => {
  const count = propertyType === 'residential' ? 6 : propertyType === 'commercial' ? 4 : 3
  const pool = propertyType === 'residential'
    ? residentialImagePool
    : propertyType === 'commercial'
      ? commercialImagePool
      : landImagePool

  const selected = []
  for (let i = 0; i < count; i += 1) {
    const idx = (seed + i * 3) % pool.length
    selected.push(pool[idx])
  }

  return selected.map((url, index) => ({
    url,
    publicId: `seed/property-${seed}-${index + 1}`,
    order: index + 1,
  }))
}

const clearDatabase = async () => {
  await Promise.all([
    Notification.deleteMany({}),
    Payment.deleteMany({}),
    BookingRequest.deleteMany({}),
    Wishlist.deleteMany({}),
    Lead.deleteMany({}),
    Property.deleteMany({}),
    User.deleteMany({}),
  ])
}

const createUsers = async () => {
  const password = await bcryptjs.hash(PASSWORD_PLAIN, 10)
  const users = []

  users.push({
    firstname: 'System',
    lastname: 'Admin',
    email: 'admin@realestate.local',
    phone: makePhone(),
    password,
    role: 'admin',
    verified: true,
    bio: 'Primary admin account for seeded environment.',
    avatar: {
      url: 'https://picsum.photos/seed/admin-avatar/300/300',
      publicId: 'seed/admin-avatar',
    },
  })

  users.push({
    firstname: 'Shubham',
    lastname: 'Agent',
    email: DEMO_AGENT_EMAIL,
    phone: makePhone(),
    password,
    role: 'agent',
    verified: true,
    bio: 'Primary demo agent account with most listings and leads for presentation.',
    avatar: {
      url: 'https://source.unsplash.com/300x300/?man,professional,portrait&sig=991',
      publicId: 'seed/demo-agent-avatar',
    },
  })

  for (let i = 1; i <= 5; i += 1) {
    users.push({
      firstname: pick(firstNames),
      lastname: pick(lastNames),
      email: `agent${i}@demo.local`,
      phone: makePhone(),
      password,
      role: 'agent',
      verified: true,
      bio: `Experienced real-estate consultant #${i}.`,
      avatar: {
        url: `https://picsum.photos/seed/agent-avatar-${i}/300/300`,
        publicId: `seed/agent-avatar-${i}`,
      },
    })
  }

  users.push({
    firstname: 'Shubham',
    lastname: 'Buyer',
    email: DEMO_BUYER_EMAIL,
    phone: makePhone(),
    password,
    role: 'buyer',
    verified: true,
    bio: 'Primary demo buyer account for inquiry and notification/email showcase.',
    avatar: {
      url: 'https://source.unsplash.com/300x300/?person,portrait,casual&sig=992',
      publicId: 'seed/demo-buyer-avatar',
    },
  })

  for (let i = 1; i <= 24; i += 1) {
    users.push({
      firstname: pick(firstNames),
      lastname: pick(lastNames),
      email: `buyer${i}@demo.local`,
      phone: makePhone(),
      password,
      role: 'buyer',
      verified: i % 7 !== 0,
      bio: `Buyer profile #${i} looking for opportunities.`,
      avatar: {
        url: `https://picsum.photos/seed/buyer-avatar-${i}/300/300`,
        publicId: `seed/buyer-avatar-${i}`,
      },
    })
  }

  return User.insertMany(users)
}

const createProperties = async ({ admin, agents, buyers }) => {
  const properties = []
  const demoAgent = agents.find((agent) => agent.email === DEMO_AGENT_EMAIL)
  const otherAgents = agents.filter((agent) => agent.email !== DEMO_AGENT_EMAIL)

  const totalProperties = 90
  const demoAgentPropertyCount = 58

  for (let i = 1; i <= totalProperties; i += 1) {
    const cityMeta = pick(cities)
    const isDemoAgentProperty = i <= demoAgentPropertyCount
    const assignedAgent = isDemoAgentProperty ? demoAgent : pick(otherAgents)
    const propertyType = isDemoAgentProperty
      ? pick(['residential', 'residential', 'commercial', 'land'])
      : pick(propertyTypePool)
    const owner = Math.random() < 0.2 ? admin : assignedAgent
    const propertyName = makeName()
    const price = makePrice(propertyType)
    const images = makeImageSet(i, propertyType)
    const favorites = pickMany(buyers, rand(0, 8)).map((buyer) => buyer._id)

    properties.push({
      title: `${propertyType[0].toUpperCase() + propertyType.slice(1)} in ${cityMeta.city} - ${propertyName}`,
      description: `Well-maintained ${propertyType} property with good connectivity and future value growth potential in ${cityMeta.city}.`,
      owner: owner._id,
      agent: assignedAgent._id,
      address: makeAddress(cityMeta.city),
      city: cityMeta.city,
      state: cityMeta.state,
      zipcode: `${cityMeta.zipPrefix}${rand(100, 999)}`,
      location: {
        type: 'Point',
        coordinates: jitterCoordinates(cityMeta.coords),
      },
      propertyType,
      price,
      bedrooms: propertyType === 'residential' ? rand(1, 5) : undefined,
      bathrooms: propertyType === 'residential' ? rand(1, 4) : undefined,
      propertyArea: makeArea(propertyType),
      amenities: pickMany(amenitiesPool, rand(3, 7)),
      nearbyFacilities: makeNearbyFacilities(),
      highlights: pickMany(cityMeta.highlights, rand(2, cityMeta.highlights.length)),
      distanceToRailway: Number((Math.random() * 15 + 0.5).toFixed(2)),
      distanceToAirport: Number((Math.random() * 25 + 2).toFixed(2)),
      distanceToHospital: Number((Math.random() * 6 + 0.3).toFixed(2)),
      distanceToSchool: Number((Math.random() * 5 + 0.2).toFixed(2)),
      distanceToMetro: Number((Math.random() * 10 + 0.5).toFixed(2)),
      images,
      featuredImage: {
        url: images[0].url,
        publicId: images[0].publicId,
      },
      status: isDemoAgentProperty
        ? (Math.random() < 0.05 ? 'inactive' : Math.random() < 0.12 ? 'sold' : 'active')
        : (Math.random() < 0.1 ? 'inactive' : Math.random() < 0.18 ? 'sold' : 'active'),
      views: rand(0, 3000),
      featured: isDemoAgentProperty ? Math.random() < 0.28 : Math.random() < 0.14,
      favorites,
    })
  }

  return Property.insertMany(properties)
}

const buildLead = ({ buyer, property, status, createdAt }) => {
  const lead = {
    buyer: buyer._id,
    property: property._id,
    agent: property.agent,
    buyerName: `${buyer.firstname} ${buyer.lastname}`,
    buyerEmail: buyer.email,
    buyerPhone: buyer.phone || makePhone(),
    budget: rand(2000000, 35000000),
    preferredTimeline: pick(timelinePool),
    interest: pick(interestPool),
    status,
    source: pick(sourcePool),
    isWarmLead: Math.random() < 0.35,
    notes: [],
    createdAt,
    updatedAt: new Date(createdAt.getTime() + rand(1, 20) * 60 * 60 * 1000),
  }

  if (lead.agent) {
    const noteCount = rand(0, 3)
    for (let n = 0; n < noteCount; n += 1) {
      lead.notes.push({
        agentId: lead.agent,
        message: `Follow-up ${n + 1}: Buyer requested more details and pricing clarity.`,
        createdAt: new Date(createdAt.getTime() + (n + 1) * 24 * 60 * 60 * 1000),
      })
    }
  }

  if (status !== 'new') {
    lead.lastContactedAt = new Date(createdAt.getTime() + rand(1, 10) * 24 * 60 * 60 * 1000)
  }

  if (status === 'viewing' || status === 'negotiating') {
    lead.viewingScheduledDate = new Date(Date.now() + rand(2, 20) * 24 * 60 * 60 * 1000)
  }

  if (status === 'converted') {
    lead.convertedAt = new Date(createdAt.getTime() + rand(5, 45) * 24 * 60 * 60 * 1000)
  } else if (status !== 'lost') {
    lead.nextFollowupDate = new Date(Date.now() + rand(1, 14) * 24 * 60 * 60 * 1000)
  }

  return lead
}

const createLeads = async ({ buyers, properties, demoAgentId }) => {
  const leads = []
  const uniqueLeadKey = new Set()
  const maxLeads = 180
  let attempts = 0

  const demoBuyer = buyers.find((buyer) => buyer.email === DEMO_BUYER_EMAIL)
  const demoAgentProperties = properties.filter(
    (property) => property.agent?.toString() === demoAgentId.toString()
  )

  // Prioritize demo buyer leads on demo agent properties for college demo flows.
  const demoTarget = Math.min(58, demoAgentProperties.length)
  for (let i = 0; i < demoTarget; i += 1) {
    const property = demoAgentProperties[i]
    const uniqueKey = `${demoBuyer._id.toString()}_${property._id.toString()}`
    uniqueLeadKey.add(uniqueKey)

    const createdOffsetDays = rand(1, 120)
    const createdAt = new Date(Date.now() - createdOffsetDays * 24 * 60 * 60 * 1000)
    const status = pick(leadStatusWeightedPool)
    leads.push(buildLead({ buyer: demoBuyer, property, status, createdAt }))
  }

  while (leads.length < maxLeads && attempts < 4000) {
    attempts += 1
    const buyer = Math.random() < 0.35 ? demoBuyer : pick(buyers)
    const property = pick(properties)
    const uniqueKey = `${buyer._id.toString()}_${property._id.toString()}`

    if (uniqueLeadKey.has(uniqueKey)) continue
    uniqueLeadKey.add(uniqueKey)

    const status = pick(leadStatusWeightedPool)
    const createdOffsetDays = rand(1, 180)
    const createdAt = new Date(Date.now() - createdOffsetDays * 24 * 60 * 60 * 1000)
    leads.push(buildLead({ buyer, property, status, createdAt }))
  }

  return Lead.insertMany(leads)
}

const getTokenAmount = (price) => {
  const onePercent = Math.round(Number(price || 0) * 0.01)
  return Math.max(1000, Math.min(onePercent || 1000, 50000))
}

const createBookingFlowSeed = async ({ leads, demoBuyer, demoAgent }) => {
  const buyerLeads = leads
    .filter((lead) => lead.buyer?.toString() === demoBuyer._id.toString())
    .filter((lead) => !['lost', 'converted'].includes(lead.status))
    .slice(0, 3)

  if (buyerLeads.length === 0) {
    return { bookingRequests: [], payments: [] }
  }

  const [pendingLead, paidLead, completedLead] = buyerLeads
  const bookingRequests = []
  const notifications = []

  const addBooking = (lead, status, overrides = {}) => {
    const tokenAmount = overrides.tokenAmount || getTokenAmount(lead.property?.price)

    bookingRequests.push({
      lead: lead._id,
      property: lead.property,
      buyer: lead.buyer,
      agent: lead.agent || demoAgent._id,
      createdBy: demoAgent._id,
      tokenAmount,
      currency: 'INR',
      expiresAt: overrides.expiresAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status,
      notes: overrides.notes || `Seeded ${status} booking request.`,
      paidAt: overrides.paidAt,
      completedAt: overrides.completedAt,
    })

    notifications.push(
      {
        user: lead.buyer,
        type: status === 'pending' ? 'booking_request_created' : status === 'paid' ? 'booking_token_paid' : 'booking_request_completed',
        title: status === 'pending' ? 'Booking Token Request Received' : status === 'paid' ? 'Booking Token Paid' : 'Booking Completed',
        message: status === 'pending'
          ? `A booking token request was created for ${lead.property?.title || 'a property'}`
          : status === 'paid'
            ? `Your booking token for ${lead.property?.title || 'a property'} has been received`
            : `Your booking for ${lead.property?.title || 'a property'} has been completed`,
        data: {
          leadId: lead._id,
          propertyId: lead.property,
          actionUrl: '/buyer/booking-requests',
        },
      },
      {
        user: lead.agent || demoAgent._id,
        type: status === 'pending' ? 'booking_request_created' : status === 'paid' ? 'booking_token_paid' : 'booking_request_completed',
        title: status === 'pending' ? 'Booking Token Request Sent' : status === 'paid' ? 'Booking Token Paid' : 'Booking Completed',
        message: status === 'pending'
          ? `Booking token request created for ${lead.property?.title || 'a property'}`
          : status === 'paid'
            ? `Booking token received for ${lead.property?.title || 'a property'}`
            : `Booking for ${lead.property?.title || 'a property'} has been completed`,
        data: {
          leadId: lead._id,
          propertyId: lead.property,
          actionUrl: '/agent/booking-requests',
        },
      }
    )
  }

  addBooking(pendingLead, 'pending')
  if (paidLead) {
    addBooking(paidLead, 'paid', { paidAt: new Date() })
  }
  if (completedLead) {
    addBooking(completedLead, 'completed', {
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(),
    })
  }

  const insertedRequests = await BookingRequest.insertMany(bookingRequests)

  const payments = insertedRequests
    .filter((request) => ['paid', 'completed'].includes(request.status))
    .map((request) => ({
      user: request.buyer,
      property: request.property,
      bookingRequest: request._id,
      amount: request.tokenAmount,
      currency: 'INR',
      receipt: `seed-${request.status}-${request._id.toString().slice(-8)}`,
      status: 'paid',
      notes: { source: 'seed', bookingFlow: true },
      razorpayOrderId: `order_seed_${request._id.toString().slice(-8)}`,
      razorpayPaymentId: `pay_seed_${request._id.toString().slice(-8)}`,
      razorpaySignature: 'seed_signature',
      gatewayStatus: 'captured',
      paidAt: request.paidAt || new Date(),
    }))

  if (payments.length > 0) {
    const insertedPayments = await Payment.insertMany(payments)
    await Promise.all(
      insertedRequests
        .filter((request) => ['paid', 'completed'].includes(request.status))
        .map(async (request) => {
          const paymentDoc = insertedPayments.find(
            (payment) => payment.bookingRequest.toString() === request._id.toString()
          )
          if (paymentDoc) {
            request.payment = paymentDoc._id
            await request.save()
          }
        })
    )
  }

  await Notification.insertMany(notifications)

  const propertyIdsToUpdate = insertedRequests
    .filter((request) => ['paid', 'completed'].includes(request.status))
    .map((request) => ({
      id: request.property,
      status: request.status === 'paid' ? 'on_hold' : 'sold',
    }))

  await Promise.all(
    propertyIdsToUpdate.map(({ id, status }) =>
      Property.findByIdAndUpdate(id, { status })
    )
  )

  return { bookingRequests: insertedRequests, payments }
}

const runSeed = async () => {
  await connectDB()

  const isClearOnly = process.argv.includes('--clear')

  try {
    console.log('🧹 Clearing existing collections...')
    await clearDatabase()

    if (isClearOnly) {
      console.log('✅ Database cleared successfully.')
      return
    }

    console.log('👤 Seeding users...')
    const users = await createUsers()
    const admin = users.find((user) => user.role === 'admin')
    const agents = users.filter((user) => user.role === 'agent')
    const buyers = users.filter((user) => user.role === 'buyer')
    const demoAgent = users.find((user) => user.email === DEMO_AGENT_EMAIL)
    const demoBuyer = users.find((user) => user.email === DEMO_BUYER_EMAIL)

    console.log('🏠 Seeding properties...')
    const properties = await createProperties({ admin, agents, buyers })

    console.log('📈 Seeding leads...')
    const leads = await createLeads({ buyers, properties, demoAgentId: demoAgent._id })

    console.log('🧾 Seeding booking flow data...')
    const bookingFlow = await createBookingFlowSeed({
      leads,
      demoBuyer,
      demoAgent,
    })

    const demoAgentPropertyCount = properties.filter(
      (property) => property.agent?.toString() === demoAgent._id.toString()
    ).length
    const demoBuyerLeadCount = leads.filter(
      (lead) => lead.buyer?.toString() === demoBuyer._id.toString()
    ).length

    console.log('✅ Seed completed successfully!')
    console.log(`   Users: ${users.length}`)
    console.log(`   Properties: ${properties.length}`)
    console.log(`   Leads: ${leads.length}`)
    console.log(`   Booking Requests: ${bookingFlow.bookingRequests.length}`)
    console.log(`   Payments: ${bookingFlow.payments.length}`)
    console.log(`   Demo agent (${DEMO_AGENT_EMAIL}) properties: ${demoAgentPropertyCount}`)
    console.log(`   Demo buyer (${DEMO_BUYER_EMAIL}) leads: ${demoBuyerLeadCount}`)
    console.log(`   Default password for all users: ${PASSWORD_PLAIN}`)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exitCode = 1
  } finally {
    await disconnectDB()
  }
}

runSeed()