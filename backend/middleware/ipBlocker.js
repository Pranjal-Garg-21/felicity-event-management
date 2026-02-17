const BlockedIP = require('../models/BlockedIP');
const SecurityEvent = require('../models/SecurityEvent');
const securityConfig = require('../config/security');
const { getClientIP, logSecurityEvent } = require('../utils/securityLogger');

/**
 * Middleware to check if an IP is blocked
 */
const checkBlockedIP = async (req, res, next) => {
    const ip = getClientIP(req);

    try {
        // Check if IP is currently blocked
        const blocked = await BlockedIP.findOne({
            ipAddress: ip,
            expiresAt: { $gt: new Date() }
        });

        if (blocked) {
            const timeLeft = Math.ceil((blocked.expiresAt - new Date()) / 1000 / 60);

            await logSecurityEvent({
                eventType: 'ip_blocked',
                ipAddress: ip,
                email: req.body?.email || '',
                userAgent: req.headers['user-agent'] || '',
                actionTaken: 'blocked',
                details: `Access denied - IP blocked. ${timeLeft} minutes remaining. Reason: ${blocked.reason}`
            });

            return res.status(403).json({
                message: `Your IP has been temporarily blocked due to suspicious activity. Try again in ${timeLeft} minutes.`,
                blockedUntil: blocked.expiresAt
            });
        }

        next();
    } catch (error) {
        console.error('IP blocker error:', error.message);
        // Don't block on errors - allow through
        next();
    }
};

/**
 * Auto-block an IP after threshold failures for a SPECIFIC email
 * Only blocks if the SAME email has too many failures from this IP,
 * preventing one bad account from blocking all accounts on shared IPs.
 */
const autoBlockIP = async (ip, email = '') => {
    try {
        const { autoBlockThreshold, autoUnblockAfter } = securityConfig.ipBlocking;
        const windowMs = securityConfig.rateLimit.windowMs;

        // Count recent failed attempts from this IP for THIS SPECIFIC EMAIL
        const query = {
            ipAddress: ip,
            eventType: { $in: ['failed_login', 'captcha_failed', 'failed_register'] },
            createdAt: { $gte: new Date(Date.now() - windowMs) }
        };

        // If we have an email, count per-email failures; otherwise count all IP failures
        if (email) {
            query.email = email;
        }

        const recentFailures = await SecurityEvent.countDocuments(query);

        // Only auto-block if many failures from same email (or no email provided and generic threshold much higher)
        const threshold = email ? autoBlockThreshold : autoBlockThreshold * 3;

        if (recentFailures >= threshold) {
            // Check if already blocked
            const existing = await BlockedIP.findOne({ ipAddress: ip });
            if (!existing) {
                await BlockedIP.create({
                    ipAddress: ip,
                    reason: `Auto-blocked: ${recentFailures} failed attempts${email ? ` for ${email}` : ''} in ${windowMs / 60000} minutes`,
                    expiresAt: new Date(Date.now() + autoUnblockAfter),
                    failedAttempts: recentFailures,
                    isManual: false,
                    blockedBy: 'system'
                });

                await logSecurityEvent({
                    eventType: 'brute_force_detected',
                    ipAddress: ip,
                    email,
                    actionTaken: 'blocked',
                    details: `IP auto-blocked after ${recentFailures} failed attempts for ${email || 'unknown'}. Unblocks in ${autoUnblockAfter / 3600000} hours.`
                });

                console.log(`🚫 IP ${ip} auto-blocked after ${recentFailures} failures for ${email}`);
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Auto-block error:', error.message);
        return false;
    }
};

module.exports = { checkBlockedIP, autoBlockIP };
