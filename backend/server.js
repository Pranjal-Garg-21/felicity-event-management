const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const eventRoutes = require('./routes/eventRoutes');
dotenv.config();
const userRoutes = require('./routes/userRoutes');
const app = express();

// CORS Configuration for Production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL || 'https://your-frontend-app.vercel.app',
  'https://felicity-event-management.vercel.app', // Original Vercel URL
  'https://felicity-event-management-snowy.vercel.app' // Actual deployed Vercel URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware
app.use(express.json()); // Essential for parsing req.body
app.use('/api/events', eventRoutes);
// Connect to MongoDB [cite: 14, 154]
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Connection Error:", err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Felicity Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// LINK YOUR ROUTES HERE
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/users', userRoutes);
app.use('/api/teams', require('./routes/teamRoutes')); // Team management routes
app.use('/api/attendance', require('./routes/attendanceRoutes')); // Attendance tracking routes
app.use('/api/forum', require('./routes/forumRoutes')); // Discussion forum routes
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));