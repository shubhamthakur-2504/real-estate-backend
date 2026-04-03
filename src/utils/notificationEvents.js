/**
 * Notification Events Helper
 * Centralized place to trigger notifications when events happen
 * Used by controllers to create both in-app notifications and send emails
 */

import { createNotification } from '../controllers/notificationController.js'

/**
 * Send notification when lead is assigned
 */
export const notifyLeadAssigned = async (agentId, leadData) => {
  await createNotification(agentId, {
    type: 'lead_assigned',
    title: 'New Lead Assigned',
    message: `${leadData.buyerName} is interested in ${leadData.propertyTitle}`,
    data: {
      leadId: leadData.leadId,
      propertyId: leadData.propertyId,
      actionUrl: `/leads/${leadData.leadId}`,
    },
  })
}

/**
 * Send notification when lead status is updated
 */
export const notifyLeadStatusUpdated = async (buyerId, statusData) => {
  await createNotification(buyerId, {
    type: 'lead_status_updated',
    title: 'Inquiry Status Updated',
    message: `Your inquiry for ${statusData.propertyTitle} is now "${statusData.status}"`,
    data: {
      leadId: statusData.leadId,
      propertyId: statusData.propertyId,
      actionUrl: `/buyer/inquiries`,
    },
  })
}

/**
 * Send notification for new inquiry received
 */
export const notifyInquiryReceived = async (agentId, inquiryData) => {
  await createNotification(agentId, {
    type: 'inquiry_received',
    title: 'New Property Inquiry',
    message: `${inquiryData.buyerName} inquired about ${inquiryData.propertyTitle}`,
    data: {
      leadId: inquiryData.leadId,
      propertyId: inquiryData.propertyId,
      actionUrl: `/leads/${inquiryData.leadId}`,
    },
  })
}

/**
 * Send system notification (for admin alerts, etc.)
 */
export const notifySystem = async (userId, message) => {
  await createNotification(userId, {
    type: 'system',
    title: 'System Alert',
    message,
    data: {},
  })
}
