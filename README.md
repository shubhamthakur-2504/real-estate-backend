# Real Estate Management System - Backend

Express + Node.js backend for the Real Estate Management System.

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (Authentication)
- Nodemailer (Email)
- Cloudinary (Image Upload)
- Joi (Validation)

## Project Structure

```
src/
├── config/         # Configuration files
├── models/         # MongoDB schemas
├── controllers/    # Route controllers
├── routes/         # API routes
├── middlewares/    # Custom middlewares
├── services/       # Business logic
├── utils/          # Utility functions
├── app.js          # Express app setup
└── server.js       # Server entry point
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create .env file**
   ```bash
   cp .env.example .env
   ```

3. **Update environment variables**
   ```env
   MONGODB_URI=mongodb://localhost:27017/real-estate-db
   JWT_SECRET=your_secret_key
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Ensure MongoDB is running**
   ```bash
   mongod
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Start production server**
   ```bash
   npm start
   ```

## Available Scripts

- `npm run dev` - Start development server with nodemon (http://localhost:5000)
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Configuration

### Database
- Local MongoDB: `mongodb://localhost:27017/real-estate-db`
- MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/real-estate-db`

### Authentication
- JWT Secret: Used for signing tokens
- Token Expiry: Default 7 days

### Email Setup (Gmail)
1. Enable 2-factor authentication on Gmail
2. Generate App Password
3. Add to `.env`:
   ```
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

### Cloudinary Setup
1. Create free account at https://cloudinary.com
2. Get API credentials from dashboard
3. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=xxx
   CLOUDINARY_API_KEY=xxx
   CLOUDINARY_API_SECRET=xxx
   ```

## API Endpoints

### Auth
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user
- POST `/api/auth/logout` - Logout user
- POST `/api/auth/refresh-token` - Refresh JWT token

### Properties
- GET `/api/properties` - Get all properties
- GET `/api/properties/:id` - Get property details
- POST `/api/properties` - Create property
- PUT `/api/properties/:id` - Update property
- DELETE `/api/properties/:id` - Delete property

### Leads
- GET `/api/leads` - Get all leads
- POST `/api/leads` - Create lead
- PUT `/api/leads/:id` - Update lead
- DELETE `/api/leads/:id` - Delete lead

### Admin
- GET `/api/admin/dashboard` - Dashboard metrics
- GET `/api/admin/users` - List users

## Security Features

- JWT authentication
- Password hashing (bcryptjs)
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation (Joi)
- HTTP Parameter Pollution prevention

## Contributing

1. Create feature branches
2. Follow REST API conventions
3. Add proper error handling
4. Write clean, documented code
5. Test endpoints before committing

## Notes

- All timestamps are in UTC
- Pagination uses skip/limit pattern
- Rate limiting: 100 requests per 15 minutes
- Maximum upload size: 5MB
