import nodemailer from 'nodemailer'

const smtpHost = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST
const smtpPort = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587)
const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER
const smtpPass = process.env.BREVO_SMTP_PASSWORD || process.env.SMTP_PASS

const transporter = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
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
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 600;">🎯 New Lead Assignment</h2>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">You have a new property inquiry!</p>
      </div>

      <div style="background-color: white; padding: 40px 20px;">
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
          Hello,<br><br>
          You have been assigned a new lead for a property inquiry. Here are the complete details:
        </p>

        <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
            Property Details
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Property:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${leadData.propertyTitle}</td>
            </tr>
            <tr style="background-color: rgba(255, 255, 255, 0.5);">
              <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${leadData.propertyCity}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Price:</strong></td>
              <td style="padding: 8px 0; color: #2E7D32; text-align: right; font-weight: 600; font-size: 18px;">₹${leadData.propertyPrice?.toLocaleString('en-IN') || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 25px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #ff8a65; padding-bottom: 10px;">
            👤 Buyer Information
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Name:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${leadData.buyerName}</td>
            </tr>
            <tr style="background-color: rgba(255, 255, 255, 0.5);">
              <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${leadData.buyerEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${leadData.buyerPhone}</td>
            </tr>
            <tr style="background-color: rgba(255, 255, 255, 0.5);">
              <td style="padding: 8px 0; color: #666;"><strong>Budget:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">₹${leadData.budget?.toLocaleString('en-IN') || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Timeline:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${leadData.preferredTimeline || 'Not specified'}</td>
            </tr>
            <tr style="background-color: rgba(255, 255, 255, 0.5);">
              <td style="padding: 8px 0; color: #666;"><strong>Interest Level:</strong></td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="background-color: ${leadData.interest === 'high' ? '#4CAF50' : leadData.interest === 'medium' ? '#FF9800' : '#F44336'}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px;">
                  ${(leadData.interest || 'medium').toUpperCase()}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${leadLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.2s;">
            View Lead in Dashboard →
          </a>
        </div>

        <div style="background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 25px 0; border-radius: 4px;">
          <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>💡 Next Steps:</strong> Review the buyer's details, contact them to understand their needs better, and schedule a property showing if interested.
          </p>
        </div>

        <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
          <strong>Follow-up Reminders:</strong> Quick response times significantly improve lead conversion rates. Aim to contact the buyer within 24 hours.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Real Estate Platform. All rights reserved.
        </p>
      </div>
    </div>
  `
  return sendEmail(email, '🎯 New Lead: ' + leadData.buyerName, html)
}

// Send lead status update notification to buyer
export const sendLeadStatusEmail = async (email, leadData) => {
  const leadsLink = `${process.env.FRONTEND_URL}/buyer/inquiries`
  const statusMessages = {
    contacted: '📞 Your inquiry has been received, and our team will be in touch shortly with more information.',
    interested: '👍 Great news! We are very interested in helping you with this property.',
    viewing: '🔍 Your property viewing has been scheduled! Check your dashboard for viewing details and timings.',
    negotiating: '💬 We are in advanced discussions regarding this property. Your agent will contact you soon.',
    converted: '✅ Congratulations! Your property purchase has been successfully finalized. Thank you for choosing us!',
    lost: '❌ Unfortunately, this lead could not be converted at this time. Feel free to explore other properties.',
    new: '📝 Your inquiry has been received and logged in our system.',
  }

  const statusColors = {
    contacted: '#2E7D32',
    interested: '#1976D2',
    viewing: '#F57C00',
    negotiating: '#7B1FA2',
    converted: '#388E3C',
    lost: '#C62828',
    new: '#0288D1',
  }

  const statusEmojis = {
    contacted: '📞',
    interested: '👍',
    viewing: '🔍',
    negotiating: '💬',
    converted: '✅',
    lost: '❌',
    new: '📝',
  }

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, ${statusColors[leadData.status] || '#2E7D32'} 0%, ${statusColors[leadData.status] ? 'rgba(0,0,0,0.1)' : '#2E7D32'} 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 600;">${statusEmojis[leadData.status] || '📩'} Lead Status Update</h2>
        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Status: <strong style="text-transform: uppercase; letter-spacing: 1px;">${leadData.status}</strong></p>
      </div>

      <div style="background-color: white; padding: 40px 20px;">
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
          Hello <strong>${leadData.buyerName}</strong>,
        </p>

        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 20px 0 30px 0;">
          ${statusMessages[leadData.status] || 'Your lead status has been updated.'}
        </p>

        <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 5px solid ${statusColors[leadData.status] || '#2E7D32'};">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Your Inquiry Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Property:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${leadData.propertyTitle}</td>
            </tr>
            <tr style="background-color: rgba(255, 255, 255, 0.3);">
              <td style="padding: 8px 0; color: #666;"><strong>Current Status:</strong></td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="background-color: ${statusColors[leadData.status] || '#2E7D32'}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px;">
                  ${(leadData.status || 'new').toUpperCase()}
                </span>
              </td>
            </tr>
            ${leadData.agentMessage ? `
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Agent's Note:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right; font-style: italic;">"${leadData.agentMessage}"</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${leadsLink}" style="background: linear-gradient(135deg, ${statusColors[leadData.status] || '#2E7D32'} 0%, rgba(0,0,0,0.1) 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.2s;">
            View Your Inquiries →
          </a>
        </div>

        <div style="background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 25px 0; border-radius: 4px;">
          <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>💡 Tip:</strong> Keep an eye on your dashboard for any updates. Our agents are working hard to match you with the perfect property!
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; margin: 0;">
          If you have any questions about your inquiry or need to reschedule, please don't hesitate to contact our team. We're here to help!
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Real Estate Platform. All rights reserved. | <a href="${process.env.FRONTEND_URL}" style="color: #667eea; text-decoration: none;">Visit our platform</a>
        </p>
      </div>
    </div>
  `
  return sendEmail(email, `${statusEmojis[leadData.status] || '📩'} Your Lead Status: ${(leadData.status || 'new').toUpperCase()}`, html)
}

// Send property inquiry confirmation email to buyer
export const sendPropertyInquiryConfirmation = async (email, buyerName, propertyData) => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #2E7D32 0%, #155724 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 600;">✅ Inquiry Received</h2>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your property inquiry has been successfully submitted!</p>
      </div>

      <div style="background-color: white; padding: 40px 20px;">
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
          Hi <strong>${buyerName}</strong>,
        </p>

        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 20px 0 30px 0;">
          Thank you so much for showing interest in this property! We have successfully received your inquiry and our dedicated team will review your details to connect you with the right agent.
        </p>

        <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #2E7D32;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Property Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Property:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right; font-weight: 500;">${propertyData.title}</td>
            </tr>
            <tr style="background-color: rgba(255, 255, 255, 0.3);">
              <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${propertyData.address}, ${propertyData.city}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Price:</strong></td>
              <td style="padding: 8px 0; color: #2E7D32; text-align: right; font-weight: 600; font-size: 18px;">₹${propertyData.price?.toLocaleString('en-IN') || 'N/A'}</td>
            </tr>
            <tr style="background-color: rgba(255, 255, 255, 0.3);">
              <td style="padding: 8px 0; color: #666;"><strong>Property Type:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${propertyData.type || 'Residential'}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef3e2; border-left: 4px solid #FF9800; padding: 15px; margin: 25px 0; border-radius: 4px;">
          <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>⏱️ What's Next?</strong> An agent will contact you within 24 hours to discuss your requirements and schedule a property viewing at your convenience.
          </p>
        </div>

        <div style="background-color: #e3f2fd; border-left: 4px solid #1976D2; padding: 15px; margin: 25px 0; border-radius: 4px;">
          <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>💡 Pro Tip:</strong> You can now save this property to your wishlist and get alerts if the price changes or new similar properties are listed!
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/buyer/properties" style="background: linear-gradient(135deg, #2E7D32 0%, #155724 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.2s;">
            Browse More Properties →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; margin: 15px 0 0 0; line-height: 1.6;">
          For any questions or urgent matters, please reply to this email or call us directly. Our support team is available Monday to Saturday, 9:00 AM - 6:00 PM.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Real Estate Platform. All rights reserved. | <a href="${process.env.FRONTEND_URL}" style="color: #667eea; text-decoration: none;">Visit our platform</a>
        </p>
      </div>
    </div>
  `
  return sendEmail(email, '✅ We received your inquiry - ' + propertyData.title, html)
}
