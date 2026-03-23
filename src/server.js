import 'dotenv/config'
import app from './app.js'
import { connectDB } from './config/database.js'

const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
