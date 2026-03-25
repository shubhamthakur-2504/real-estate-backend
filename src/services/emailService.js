import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject,
      html,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('📧 Email sent:', info.response)
    return true
  } catch (error) {
    console.error('❌ Error sending email:', error)
    throw error
  }
}

export const sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome! Verify Your Email</h2>
      <p style="color: #666; font-size: 16px;">Thank you for creating an account. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Or copy this link in your browser:</p>
      <p style="color: #0066cc; word-break: break-all;">${verificationLink}</p>
      <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
    </div>
  `
  return sendEmail(email, 'Verify Your Email Address', html)
}

export const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
  const html = `
    <h2>Password Reset Request</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${resetLink}">Reset Password</a>
  `
  return sendEmail(email, 'Password Reset', html)
}

export const sendLeadNotification = async (email, leadData) => {
  const leadLink = `${process.env.FRONTEND_URL}/dashboard/leads/${leadData.leadId}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2E7D32;">🎯 New Lead Assignment</h2>
      <p style="color: #555; font-size: 16px;">You have been assigned a new lead! Here are the details:</p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Property Details</h3>
        <p><strong>Property:</strong> ${leadData.propertyTitle}</p>
        <p><strong>Location:</strong> ${leadData.propertyCity}</p>
        <p><strong>Price:</strong> ₹${leadData.propertyPrice?.toLocaleString('en-IN') || 'N/A'}</p>

        <h3 style="color: #333;">Buyer Information</h3>
        <p><strong>Name:</strong> ${leadData.buyerName}</p>
        <p><strong>Email:</strong> ${leadData.buyerEmail}</p>
        <p><strong>Phone:</strong> ${leadData.buyerPhone}</p>
        <p><strong>Budget:</strong> ₹${leadData.budget?.toLocaleString('en-IN') || 'N/A'}</p>
        <p><strong>Timeline:</strong> ${leadData.preferredTimeline || 'Not specified'}</p>
        <p><strong>Interest Level:</strong> <span style="color: ${leadData.interest === 'high' ? '#4CAF50' : leadData.interest === 'medium' ? '#FF9800' : '#F44336'}; font-weight: bold;">${leadData.interest || 'medium'}</span></p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${leadLink}" style="background-color: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
          View Lead in Dashboard
        </a>
      </div>

      <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
        Please follow up with the buyer as soon as possible to maximize conversion chances.
      </p>
    </div>
  `
  return sendEmail(email, '🎯 New Lead: ' + leadData.buyerName, html)
}

// Send lead status update notification to buyer
export const sendLeadStatusEmail = async (email, leadData) => {
  const leadsLink = `${process.env.FRONTEND_URL}/my-leads`
  const statusMessages = {
    contacted: 'We have received your inquiry and will contact you shortly.',
    interested: 'Excellent! We are interested in helping you with this property.',
    viewing: 'Your property viewing has been scheduled. We will send you the details soon.',
    negotiating: 'We are in advanced discussions regarding this property.',
    converted: 'Congratulations! Your property purchase has been finalized.',
    lost: 'Unfortunately, this lead could not be converted at this time.',
  }

  const statusEmojis = {
    contacted: '📞',
    interested: '👍',
    viewing: '🔍',
    negotiating: '💬',
    converted: '✅',
    lost: '❌',
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${statusEmojis[leadData.status] || '📩'} Lead Status Update</h2>
      <p style="color: #555; font-size: 16px;">Hello ${leadData.buyerName},</p>
      
      <p style="color: #555; font-size: 16px;">${statusMessages[leadData.status]}</p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Property:</strong> ${leadData.propertyTitle}</p>
        <p><strong>Status:</strong> <span style="color: #2E7D32; font-weight: bold; text-transform: uppercase;">${leadData.status}</span></p>
        ${leadData.agentMessage ? `<p><strong>Agent's Note:</strong> ${leadData.agentMessage}</p>` : ''}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${leadsLink}" style="background-color: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
          View Your Leads
        </a>
      </div>

      <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
        If you have any questions, please don't hesitate to contact us.
      </p>
    </div>
  `
  return sendEmail(email, `${statusEmojis[leadData.status] || '📩'} Your Lead Status: ${leadData.status}`, html)
}

// Send property inquiry confirmation email to buyer
export const sendPropertyInquiryConfirmation = async (email, buyerName, propertyData) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2E7D32;">✅ Inquiry Received</h2>
      <p style="color: #555; font-size: 16px;">Hi ${buyerName},</p>
      
      <p style="color: #555; font-size: 16px;">Thank you for showing interest in this property. We have received your inquiry and our team will contact you shortly.</p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Property Details</h3>
        <p><strong>Property:</strong> ${propertyData.title}</p>
        <p><strong>Location:</strong> ${propertyData.address}, ${propertyData.city}</p>
        <p><strong>Price:</strong> ₹${propertyData.price?.toLocaleString('en-IN') || 'N/A'}</p>
        <p><strong>Type:</strong> ${propertyData.type}</p>
      </div>

      <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
        We look forward to helping you find your dream property!
      </p>
    </div>
  `
  return sendEmail(email, '✅ We received your inquiry - ' + propertyData.title, html)
}
