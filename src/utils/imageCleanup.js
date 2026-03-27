import cloudinary from '../config/cloudinary.js'

/**
 * Safely delete an image from Cloudinary
 * Non-blocking - logs errors but doesn't throw
 * @param {string} publicId - Cloudinary public ID
 * @param {string} context - For logging where deletion was triggered
 * @returns {Promise<boolean>} - true if deleted, false if failed
 */
export const safeDeleteImage = async (publicId, context = 'unknown') => {
  if (!publicId) {
    console.log(`[${context}] Skipped image deletion: publicId is empty`)
    return false
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    
    if (result.result === 'ok') {
      console.log(`✅ [${context}] Image deleted from Cloudinary: ${publicId}`)
      return true
    } else if (result.result === 'not found') {
      console.log(`⚠️ [${context}] Image already deleted from Cloudinary: ${publicId}`)
      return true
    } else {
      console.error(`❌ [${context}] Failed to delete image: ${publicId}`, result)
      return false
    }
  } catch (error) {
    console.error(`❌ [${context}] Error deleting image ${publicId}:`, error.message)
    return false
  }
}

/**
 * Delete multiple images in parallel (non-blocking)
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @param {string} context - For logging
 * @returns {Promise<Array<boolean>>}
 */
export const safeDeleteImages = async (publicIds, context = 'unknown') => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    return []
  }

  return Promise.all(
    publicIds.map((publicId) => safeDeleteImage(publicId, context))
  )
}

/**
 * Replace image safely: upload new, then delete old (non-blocking old deletion)
 * Use this for avatar updates, featured image updates, etc.
 * @param {Object} params
 * @returns {Promise<Object>} - { newImage, oldImageDeleted }
 */
export const safeReplaceImage = async ({
  newImageUrl,
  newImagePublicId,
  oldImagePublicId,
  context = 'unknown',
}) => {
  // Verify new image was uploaded successfully
  if (!newImageUrl || !newImagePublicId) {
    throw new Error('New image upload failed')
  }

  // Delete old image asynchronously (non-blocking)
  // This doesn't block the response, errors are just logged
  if (oldImagePublicId) {
    safeDeleteImage(oldImagePublicId, context).catch((err) =>
      console.error(`[${context}] Background deletion failed:`, err)
    )
  }

  return {
    url: newImageUrl,
    publicId: newImagePublicId,
    oldImageDeleted: oldImagePublicId ? 'queued' : 'no-old-image', // 'queued' = will delete in background
  }
}

/**
 * Batch delete images (for bulk operations like deleting all property images)
 * Non-blocking with error handling
 * @param {Array<Object>} images - Array of {url, publicId}
 * @param {string} context - For logging
 */
export const safeBatchDeleteImages = async (images, context = 'unknown') => {
  if (!Array.isArray(images) || images.length === 0) {
    return { deleted: 0, failed: 0 }
  }

  const publicIds = images.map((img) => img.publicId).filter(Boolean)
  
  // Delete all in parallel, don't wait - just log results
  const results = await Promise.allSettled(
    publicIds.map((id) => safeDeleteImage(id, context))
  )

  const deleted = results.filter((r) => r.status === 'fulfilled' && r.value === true).length
  const failed = results.filter((r) => r.status === 'rejected' || !r.value).length

  console.log(
    `[${context}] Batch delete completed: ${deleted} deleted, ${failed} failed out of ${publicIds.length}`
  )

  return { deleted, failed, total: publicIds.length }
}
