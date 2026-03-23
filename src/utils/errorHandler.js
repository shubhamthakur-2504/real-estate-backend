// Custom error class
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
    Error.captureStackTrace(this, this.constructor)
  }
}

// Error handler wrapper for async functions
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Error response formatter
export const sendErrorResponse = (res, status, message) => {
  res.status(status).json({
    success: false,
    message,
  })
}

// Success response formatter
export const sendSuccessResponse = (res, data, message = 'Success', status = 200) => {
  res.status(status).json({
    success: true,
    message,
    data,
  })
}
