import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

// Folder structure for organized cloudinary dashboard
export const CLOUDINARY_FOLDERS = {
  PROPERTY_IMAGES: 'real-estate/properties',
  PROPERTY_FEATURED: 'real-estate/properties/featured',
  USER_AVATARS: 'real-estate/users/avatars',
  USER_DOCUMENTS: 'real-estate/users/documents',
  TEMP: 'real-estate/temp', // For temporary uploads
}

// Generate public ID for cloudinary with folder structure
export const generatePublicId = (folder, fileName) => {
  const timestamp = Date.now()
  const cleanFileName = fileName.replace(/\.[^/.]+$/, '') // Remove extension
  return `${folder}/${timestamp}-${cleanFileName}`
}

// Upload configuration
export const uploadConfig = {
  property: {
    folder: CLOUDINARY_FOLDERS.PROPERTY_IMAGES,
    resource_type: 'auto',
    max_bytes: 5242880, // 5MB
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    allowed_mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  },
  propertyFeatured: {
    folder: CLOUDINARY_FOLDERS.PROPERTY_FEATURED,
    resource_type: 'auto',
    max_bytes: 5242880, // 5MB
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    allowed_mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  },
  avatar: {
    folder: CLOUDINARY_FOLDERS.USER_AVATARS,
    resource_type: 'auto',
    max_bytes: 2097152, // 2MB
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    allowed_mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  },
  document: {
    folder: CLOUDINARY_FOLDERS.USER_DOCUMENTS,
    resource_type: 'auto',
    max_bytes: 10485760, // 10MB
    allowed_formats: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    allowed_mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'],
  },
}

// Get all allowed MIME types for general validation (when upload type not specified)
export const ALL_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
