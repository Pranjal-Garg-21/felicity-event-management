const express = require('express');
const router = express.Router();
const { registerParticipant, loginUser, requestPasswordReset } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
// Route for Participant Registration
// URL: POST http://localhost:5000/api/auth/register
router.post('/register', registerParticipant);
// router.post('/register', registerParticipant);
// Route for Login (All Roles)
// URL: POST http://localhost:5000/api/auth/login
router.post('/login', loginUser);
router.post('/request-reset', protect, requestPasswordReset);
module.exports = router;