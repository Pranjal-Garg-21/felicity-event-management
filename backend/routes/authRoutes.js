const express = require('express');
const router = express.Router();
const { registerParticipant, loginUser, requestPasswordReset } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCaptcha } = require('../middleware/captchaVerifier');
const { authRateLimiter, resetRateLimit } = require('../middleware/rateLimiter');
const { checkBlockedIP, autoBlockIP } = require('../middleware/ipBlocker');
const { getClientIP, logFromRequest } = require('../utils/securityLogger');

// Route for Participant Registration
// URL: POST http://localhost:5000/api/auth/register
// Middleware chain: IP check → Rate limit → CAPTCHA verify → Log → Register
router.post('/register', checkBlockedIP, authRateLimiter, verifyCaptcha, async (req, res, next) => {
    // Intercept response to log security events
    const originalJson = res.json.bind(res);
    res.json = function (data) {
        const ip = getClientIP(req);
        if (res.statusCode >= 400) {
            logFromRequest(req, 'failed_register', 'blocked', data.message || 'Registration failed');
            autoBlockIP(ip, req.body?.email);
        } else if (res.statusCode === 201 || res.statusCode === 200) {
            resetRateLimit(ip);  // Reset rate limit on success
        }
        return originalJson(data);
    };
    next();
}, registerParticipant);

// Route for Login (All Roles)
// URL: POST http://localhost:5000/api/auth/login
// Middleware chain: IP check → Rate limit → CAPTCHA verify → Log → Login
router.post('/login', checkBlockedIP, authRateLimiter, verifyCaptcha, async (req, res, next) => {
    // Intercept response to log security events
    const originalJson = res.json.bind(res);
    res.json = function (data) {
        const ip = getClientIP(req);
        if (res.statusCode === 401 || res.statusCode === 403) {
            logFromRequest(req, 'failed_login', 'blocked', data.message || 'Login failed');
            autoBlockIP(ip, req.body?.email);
        } else if (res.statusCode === 200) {
            logFromRequest(req, 'successful_login', 'allowed', `Successful login: ${req.body?.email}`);
            resetRateLimit(ip);  // Reset rate limit on successful login
        }
        return originalJson(data);
    };
    next();
}, loginUser);

router.post('/request-reset', protect, requestPasswordReset);

module.exports = router;