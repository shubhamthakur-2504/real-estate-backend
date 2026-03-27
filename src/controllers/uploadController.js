import cloudinary from '../config/cloudinary.js'
import { CLOUDINARY_FOLDERS, uploadConfig, generatePublicId } from '../config/cloudinary.js'
import { asyncHandler, AppError, sendSuccessResponse } from '../utils/errorHandler.js'
import { safeDeleteImage, safeReplaceImage } from '../utils/imageCleanup.js'
import User from '../models/User.js'

// Validate file MIME type against upload config
const validateFileMimeType = (mimeType, uploadType) => {
  const config = uploadConfig[uploadType]
  if (!config) {
    throw new AppError(`Invalid upload type: ${uploadType}`, 400)
  }

  if (!config.allowed_mimes.includes(mimeType)) {
    throw new AppError(
      `Invalid file type for ${uploadType}: ${mimeType}. Allowed types: ${config.allowed_mimes.join(', ')}`,
      400
    )
  }
}

// Upload property images
export const uploadPropertyImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400)
  }

  const { isFeatured } = req.body
  const uploadType = isFeatured ? 'propertyFeatured' : 'property'
  const folderConfig = uploadConfig[uploadType]

  // Validate MIME type (strict per-upload-type check)
  validateFileMimeType(req.file.mimetype, uploadType)

  // Upload to Cloudinary with folder structure
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderConfig.folder,
        resource_type: folderConfig.resource_type,
        allowed_formats: folderConfig.allowed_formats,
        max_bytes: folderConfig.max_bytes,
        public_id: generatePublicId(folderConfig.folder, req.file.originalname),
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    stream.end(req.file.buffer)
  })

  sendSuccessResponse(
    res,
    {
      url: result.secure_url,
      publicId: result.public_id,
      filename: req.file.originalname,
      size: result.bytes,
      folder: folderConfig.folder,
    },
    'Image uploaded successfully',
    200
  )
})

// Upload multiple property images
export const uploadPropertyImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('Please upload at least one image', 400)
  }

  // Limit to 10 images per upload
  if (req.files.length > 10) {
    throw new AppError('Maximum 10 images allowed per upload', 400)
  }

  // Validate all files MIME types first (before uploading any)
  req.files.forEach((file) => {
    validateFileMimeType(file.mimetype, 'property')
  })

  const uploadPromises = req.files.map(
    (file) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: uploadConfig.property.folder,
            resource_type: uploadConfig.property.resource_type,
            allowed_formats: uploadConfig.property.allowed_formats,
            max_bytes: uploadConfig.property.max_bytes,
            public_id: generatePublicId(uploadConfig.property.folder, file.originalname),
          },
          (error, result) => {
            if (error) reject(error)
            else
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                filename: file.originalname,
                size: result.bytes,
              })
          }
        )
        stream.end(file.buffer)
      })
  )

  const results = await Promise.all(uploadPromises)

  sendSuccessResponse(
    res,
    {
      images: results,
      uploadedCount: results.length,
      folder: uploadConfig.property.folder,
    },
    `${results.length} images uploaded successfully`,
    200
  )
})

// Upload user avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400)
  }

  // Validate MIME type (strict per-upload-type check)
  validateFileMimeType(req.file.mimetype, 'avatar')

  // Step 1: Get user's current avatar info (to delete later)
  const user = await User.findById(req.user.id)
  const oldAvatarPublicId = user?.avatar?.publicId

  // Step 2: Upload new avatar to Cloudinary
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: uploadConfig.avatar.folder,
        resource_type: uploadConfig.avatar.resource_type,
        allowed_formats: uploadConfig.avatar.allowed_formats,
        max_bytes: uploadConfig.avatar.max_bytes,
        public_id: generatePublicId(uploadConfig.avatar.folder, `${req.user.id}-avatar`),
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    stream.end(req.file.buffer)
  })

  // Step 3: Update database with new avatar
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      avatar: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    },
    { new: true }
  )

  // Step 4: Delete old avatar asynchronously (non-blocking)
  if (oldAvatarPublicId) {
    safeDeleteImage(oldAvatarPublicId, 'uploadAvatar').catch((err) =>
      console.error('Background avatar deletion error:', err)
    )
  }

  sendSuccessResponse(
    res,
    {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      folder: uploadConfig.avatar.folder,
      message: 'Avatar updated successfully',
    },
    'Avatar uploaded successfully',
    200
  )
})

// Delete image from Cloudinary
export const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body

  if (!publicId) {
    throw new AppError('Please provide publicId', 400)
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId)

    if (result.result === 'ok') {
      sendSuccessResponse(res, null, 'Image deleted successfully', 200)
    } else {
      throw new AppError('Failed to delete image', 400)
    }
  } catch (error) {
    throw new AppError(`Error deleting image: ${error.message}`, 400)
  }
})

// Get upload stats (dashboard info)
export const getUploadStats = asyncHandler(async (req, res) => {
  try {
    const usage = await cloudinary.api.usage()

    sendSuccessResponse(
      res,
      {
        maxBytes: usage.media_limits.max_bytes,
        usedBytes: usage.media_used_bytes,
        percentageUsed: ((usage.media_used_bytes / usage.media_limits.max_bytes) * 100).toFixed(2),
        resources: usage.resources_count,
        dedupedAssets: usage.deduplicated_assets_count,
      },
      'Upload usage stats retrieved',
      200
    )
  } catch (error) {
    throw new AppError(`Error fetching usage stats: ${error.message}`, 400)
  }
})
