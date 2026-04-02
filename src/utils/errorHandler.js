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
  try {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (typeof next === 'function') {
        next(err)
      } else {
        console.error('Error handler not available:', err)
        res.status(err.status || 500).json({
          success: false,
          message: err.message || 'Internal Server Error',
        })
      }
    })
  } catch (err) {
    if (typeof next === 'function') {
      next(err)
    } else {
      console.error('Error caught:', err)
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
      })
    }
  }
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
