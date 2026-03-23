import crypto from 'crypto'
import User from '../models/User.js'
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js'

// Helper function to set refresh token as HTTP-only cookie
const setRefreshTokenCookie = (res, refreshToken) => {
  const refreshTokenExpire = parseInt(process.env.JWT_REFRESH_EXPIRE_MS || 30 * 24 * 60 * 60 * 1000)
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: refreshTokenExpire,
  })
}

export const register = asyncHandler(async (req, res) => {
  const { firstname, lastname, email, password, role } = req.body

  // Validate input
  if (!firstname || !lastname || !email || !password) {
    throw new AppError('Please provide all required fields', 400)
  }

  // Check if user exists
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new AppError('User already exists', 400)
  }

  // Create user
  const user = await User.create({
    firstname,
    lastname,
    email,
    password,
    role: role || 'buyer',
  })

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex')
  const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex')

  // Save verification token with expiration (24 hours)
  user.emailVerificationToken = hashedVerificationToken
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await user.save()

  // Send verification email
  try {
    await sendVerificationEmail(email, verificationToken)
  } catch (error) {
    // Clear verification token if email fails
    user.emailVerificationToken = null
    user.emailVerificationExpires = null
    await user.save()
    throw new AppError('Failed to send verification email', 500)
  }

  // Generate tokens
  const token = generateToken({ id: user._id, email: user.email, role: user.role })
  const refreshToken = generateRefreshToken({ id: user._id })

  // Save refresh token to database
  user.refreshToken = refreshToken
  await user.save()

  // Set refresh token as HTTP-only cookie
  setRefreshTokenCookie(res, refreshToken)

  // Return response (accessToken only, refreshToken in cookie)
  sendSuccessResponse(
    res,
    {
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
      accessToken: token,
    },
    'User registered successfully. Please check your email to verify your account.',
    201
  )
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Validate input
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400)
  }

  // Find user and select password
  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    throw new AppError('Invalid credentials', 401)
  }

  // Generate tokens
  const token = generateToken({ id: user._id, email: user.email, role: user.role })
  const refreshToken = generateRefreshToken({ id: user._id })

  // Save refresh token to database
  user.refreshToken = refreshToken
  await user.save()

  // Set refresh token as HTTP-only cookie
  setRefreshTokenCookie(res, refreshToken)

  // Return response (accessToken only, refreshToken in cookie)
  sendSuccessResponse(
    res,
    {
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
      accessToken: token,
    },
    'Login successful'
  )
})

export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token from database using authenticated user
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null })
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken')

  sendSuccessResponse(res, {}, 'Logout successful')
})

export const getCurrentUser = asyncHandler(async (req, res) => {
  // Get user from token (authenticated)
  const user = await User.findById(req.user.id)

  if (!user) {
    throw new AppError('User not found', 404)
  }

  sendSuccessResponse(
    res,
    {
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        verified: user.verified,
      },
    },
    'User retrieved successfully'
  )
})

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies

  // Validate refresh token exists
  if (!refreshToken) {
    throw new AppError('Refresh token not found', 401)
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken)

  // Find user
  const user = await User.findById(decoded.id).select('+refreshToken')
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid or expired refresh token', 401)
  }

  // Generate new access token
  const newAccessToken = generateToken({ id: user._id, email: user.email, role: user.role })

  sendSuccessResponse(
    res,
    {
      accessToken: newAccessToken,
    },
    'Access token refreshed successfully'
  )
})

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  // Validate email
  if (!email) {
    throw new AppError('Please provide email', 400)
  }

  // Find user
  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError('User not found', 404)
  }

  // Generate reset token (unhashed)
  const resetToken = crypto.randomBytes(32).toString('hex')

  // Hash and save reset token with expiration
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
  user.passwordResetToken = hashedResetToken
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  await user.save()

  // Send email with reset token
  try {
    await sendPasswordResetEmail(email, resetToken)
    sendSuccessResponse(
      res,
      {},
      'Password reset link sent to your email'
    )
  } catch (error) {
    // Clear reset token if email fails
    user.passwordResetToken = null
    user.passwordResetExpires = null
    await user.save()
    throw new AppError('Failed to send email', 500)
  }
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body

  // Validate input
  if (!resetToken || !newPassword || !confirmPassword) {
    throw new AppError('Please provide all required fields', 400)
  }

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    throw new AppError('Passwords do not match', 400)
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400)
  }

  // Hash the provided reset token
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  // Find user with valid reset token
  const user = await User.findOne({
    passwordResetToken: hashedResetToken,
    passwordResetExpires: { $gt: Date.now() },
  })

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400)
  }

  // Update password
  user.password = newPassword
  user.passwordResetToken = null
  user.passwordResetExpires = null
  await user.save()

  sendSuccessResponse(
    res,
    {},
    'Password reset successful. Please login with your new password'
  )
})

export const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.body

  // Validate token
  if (!verificationToken) {
    throw new AppError('Verification token is required', 400)
  }

  // Hash the provided verification token
  const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex')

  // Find user with valid verification token
  const user = await User.findOne({
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpires: { $gt: Date.now() },
  })

  if (!user) {
    throw new AppError('Invalid or expired verification token. Please request a new verification email.', 400)
  }

  // Mark email as verified
  user.verified = true
  user.emailVerificationToken = null
  user.emailVerificationExpires = null
  await user.save()

  sendSuccessResponse(
    res,
    {
      user: {
        id: user._id,
        email: user.email,
        verified: user.verified,
      },
    },
    'Email verified successfully'
  )
})

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  // Use authenticated user's email instead of body
  const email = req.user.email

  // Find user
  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError('User not found', 404)
  }

  // Check if already verified
  if (user.verified) {
    throw new AppError('Email is already verified', 400)
  }

  // Check rate limiting - prevent spam (resend only once per 5 minutes)
  if (user.emailVerificationExpires && user.emailVerificationExpires > new Date(Date.now() - 5 * 60 * 1000)) {
    throw new AppError('Please wait before requesting another verification email', 429)
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex')
  const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex')

  // Save new verification token with expiration (24 hours)
  user.emailVerificationToken = hashedVerificationToken
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await user.save()

  // Send verification email
  try {
    await sendVerificationEmail(email, verificationToken)
    sendSuccessResponse(
      res,
      {},
      'Verification email sent. Please check your inbox.'
    )
  } catch (error) {
    // Clear verification token if email fails
    user.emailVerificationToken = null
    user.emailVerificationExpires = null
    await user.save()
    throw new AppError('Failed to send verification email', 500)
  }
})
