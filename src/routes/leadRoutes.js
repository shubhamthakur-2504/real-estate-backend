import express from 'express'
import {
  createLead,
  getLead,
  getAllLeads,
  getAgentLeads,
  getBuyerLeads,
  getPropertyLeads,
  updateLeadStatus,
  addNoteToLead,
  updateLead,
  deleteLead,
  assignLead,
} from '../controllers/leadController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Public routes
router.get('/', getAllLeads)
router.get('/:id', getLead)

// Protected routes (require authentication)
router.post('/', authMiddleware, createLead)
router.put('/:id', authMiddleware, updateLead)
router.delete('/:id', authMiddleware, deleteLead)

// Lead status update
router.patch('/:id/status', authMiddleware, updateLeadStatus)

// Add note to lead
router.post('/:id/notes', authMiddleware, addNoteToLead)

// Agent's leads
router.get('/agent/my-leads', authMiddleware, getAgentLeads)

// Buyer's leads
router.get('/buyer/my-leads', authMiddleware, getBuyerLeads)

// Property leads
router.get('/property/:propertyId', authMiddleware, getPropertyLeads)

// Assign lead to agent (admin only)
router.post('/:id/assign', authMiddleware, assignLead)

export default router
