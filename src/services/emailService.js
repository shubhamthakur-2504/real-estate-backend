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
  const html = `
    <h2>New Lead Assignment</h2>
    <p>You have been assigned a new lead:</p>
    <p><strong>Property:</strong> ${leadData.propertyTitle}</p>
    <p><strong>Buyer:</strong> ${leadData.buyerName}</p>
    <p><strong>Interest Level:</strong> ${leadData.interest}</p>
    <p><strong>Budget:</strong> $${leadData.budget}</p>
  `
  return sendEmail(email, 'New Lead Assigned', html)
}
