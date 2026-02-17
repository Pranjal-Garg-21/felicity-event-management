const securityConfig = require('../config/security');
const { getClientIP, logFromRequest } = require('../utils/securityLogger');

// In-memory store for rate limiting (use Redis in production)
const attempts = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of attempts.entries()) {
        if (now - data.firstAttempt > securityConfig.rateLimit.windowMs) {
            attempts.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Rate limiter middleware for authentication endpoints
 * Tracks ALL attempts per IP and blocks after threshold
 * 
 * Every request increments the counter upfront.
 * On successful login, the counter is reset via resetRateLimit().
 */
const authRateLimiter = async (req, res, next) => {
    const ip = getClientIP(req);
    const now = Date.now();
    const { windowMs, maxAttempts } = securityConfig.rateLimit;

    // Get or create attempt record for this IP
    let record = attempts.get(ip);

    if (!record || (now - record.firstAttempt > windowMs)) {
        // Reset if window expired
        record = { count: 0, firstAttempt: now };
        attempts.set(ip, record);
    }

    // Check if already exceeded limit
    if (record.count >= maxAttempts) {
        const timeLeft = Math.ceil((record.firstAttempt + windowMs - now) / 1000 / 60);

        console.log(`🚫 Rate Limit BLOCKED: IP ${ip} - ${record.count}/${maxAttempts} attempts exceeded`);

        await logFromRequest(req, 'rate_limited', 'rate_limited',
            `Rate limited: ${record.count} attempts in window. ${timeLeft} min remaining.`);

        return res.status(429).json({
            message: `⚠️ Too many failed attempts (${maxAttempts} max). Please try again in ${timeLeft} minutes.`,
            retryAfter: timeLeft
        });
    }

    // Increment counter for every attempt
    record.count++;
    attempts.set(ip, record);
    console.log(`🔒 Rate Limit: IP ${ip} - Attempt ${record.count}/${maxAttempts}`);

    next();
};

/**
 * Reset rate limit for an IP (called on successful login)
 */
const resetRateLimit = (ip) => {
    attempts.delete(ip);
    console.log(`✅ Rate Limit: Reset for IP ${ip}`);
};

/**
 * Get rate limit info for an IP
 */
const getRateLimitInfo = (ip) => {
    const record = attempts.get(ip);
    if (!record) return { count: 0, remaining: securityConfig.rateLimit.maxAttempts };

    const now = Date.now();
    if (now - record.firstAttempt > securityConfig.rateLimit.windowMs) {
        return { count: 0, remaining: securityConfig.rateLimit.maxAttempts };
    }

    return {
        count: record.count,
        remaining: Math.max(0, securityConfig.rateLimit.maxAttempts - record.count)
    };
};

module.exports = { authRateLimiter, getRateLimitInfo, resetRateLimit };
