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
    <h2>Verify Your Email</h2>
    <p>Click the link below to verify your email:</p>
    <a href="${verificationLink}">Verify Email</a>
  `
  return sendEmail(email, 'Email Verification', html)
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
