import axios from 'axios'
import { AppError } from './errorHandler.js'

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search'
const REVERSE_API = 'https://nominatim.openstreetmap.org/reverse'

/**
 * Geocode address to coordinates using Nominatim (OpenStreetMap)
 * @param {string} address - Full address string
 * @returns {Promise<[number, number]>} - [longitude, latitude]
 */
export const geocodeAddress = async (address, city, state, zipcode) => {
  try {
    // Build complete address string
    let fullAddress = address
    if (city) fullAddress += `, ${city}`
    if (state) fullAddress += `, ${state}`
    if (zipcode) fullAddress += `, ${zipcode}`
    fullAddress += ', India' // Always add India for Indian properties

    const response = await axios.get(NOMINATIM_API, {
      params: {
        q: fullAddress,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'RealEstateApp/1.0', // Nominatim requires User-Agent
      },
    })

    if (!response.data || response.data.length === 0) {
      throw new AppError('Address not found. Please verify the address details.', 400)
    }

    const result = response.data[0]
    const coordinates = [parseFloat(result.lon), parseFloat(result.lat)]

    console.log(`✅ Geocoded: ${fullAddress} → [${coordinates[0]}, ${coordinates[1]}]`)

    return coordinates
  } catch (error) {
    if (error.message && error.message.includes('Address not found')) {
      throw error
    }
    console.error('❌ Geocoding error:', error.message)
    throw new AppError('Failed to geocode address. Please try again.', 500)
  }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<object>} - Address details
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get(REVERSE_API, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        zoom: 15,
      },
      headers: {
        'User-Agent': 'RealEstateApp/1.0',
      },
    })

    if (!response.data) {
      throw new AppError('Location not found', 400)
    }

    const address = response.data.address
    return {
      address: response.data.display_name,
      street: address.road || address.street || '',
      city: address.city || address.town || address.village || '',
      state: address.state || address.region || '',
      zipcode: address.postcode || '',
    }
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error.message)
    throw new AppError('Failed to reverse geocode coordinates', 500)
  }
}
