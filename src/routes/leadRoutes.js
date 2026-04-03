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
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router()

// Protected list routes
router.get('/agent/my-leads', authMiddleware, roleMiddleware('agent', 'admin'), getAgentLeads)
router.get('/buyer/my-leads', authMiddleware, roleMiddleware('buyer'), getBuyerLeads)
router.get('/property/:propertyId', authMiddleware, roleMiddleware('agent', 'admin'), getPropertyLeads)

// Protected read routes
router.get('/', authMiddleware, roleMiddleware('agent', 'admin'), getAllLeads)
router.get('/:id', authMiddleware, getLead)

// Protected write routes
router.post('/', authMiddleware, roleMiddleware('buyer', 'agent', 'admin'), createLead)
router.put('/:id', authMiddleware, roleMiddleware('buyer', 'agent', 'admin'), updateLead)
router.delete('/:id', authMiddleware, roleMiddleware('agent', 'admin'), deleteLead)

// Lead status update
router.patch('/:id/status', authMiddleware, roleMiddleware('buyer', 'agent', 'admin'), updateLeadStatus)

// Add note to lead
router.post('/:id/notes', authMiddleware, roleMiddleware('agent', 'admin'), addNoteToLead)

// Assign lead to agent (admin only)
router.post('/:id/assign', authMiddleware, roleMiddleware('admin'), assignLead)

export default router
