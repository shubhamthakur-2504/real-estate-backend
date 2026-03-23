import User from '../models/User.js'
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'

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
    'User registered successfully',
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
  // Clear refresh token from database
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null })
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken')

  sendSuccessResponse(res, {}, 'Logout successful')
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
