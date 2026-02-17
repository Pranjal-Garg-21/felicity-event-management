module.exports = {
    recaptcha: {
        siteKey: process.env.RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Test key
        secretKey: process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe', // Test key
        minScore: 0.5,
        enabled: process.env.RECAPTCHA_ENABLED !== 'false' // Enabled by default
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,     // 15 minutes
        maxAttempts: 5,                // Max failed login attempts per window
        blockDuration: 60 * 60 * 1000  // 1 hour block after exceeding
    },
    ipBlocking: {
        autoBlockThreshold: 5,                    // Auto-block after N failed attempts
        autoUnblockAfter: 24 * 60 * 60 * 1000,   // 24 hours auto-unblock
        whitelist: []                              // No whitelisted IPs - enforce everywhere
    }
};
