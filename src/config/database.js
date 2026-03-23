import mongoose from 'mongoose'

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`)
    process.exit(1)
  }
}

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect()
    console.log('✅ MongoDB Disconnected')
  } catch (error) {
    console.error(`❌ Error disconnecting from MongoDB: ${error.message}`)
  }
}
