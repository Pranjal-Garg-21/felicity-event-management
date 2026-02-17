const SecurityEvent = require('../models/SecurityEvent');

/**
 * Extract client IP from request, handling proxies
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
};

/**
 * Log a security event to the database
 */
const logSecurityEvent = async ({
    eventType,
    ipAddress,
    email = '',
    userAgent = '',
    riskScore = null,
    actionTaken = 'allowed',
    details = '',
    metadata = {}
}) => {
    try {
        const event = await SecurityEvent.create({
            eventType,
            ipAddress,
            email,
            userAgent,
            riskScore,
            actionTaken,
            details,
            metadata
        });
        console.log(`🛡️ Security Event: ${eventType} | IP: ${ipAddress} | Email: ${email} | Action: ${actionTaken}`);
        return event;
    } catch (error) {
        console.error('Failed to log security event:', error.message);
        return null;
    }
};

/**
 * Log from a request object (convenience helper)
 */
const logFromRequest = async (req, eventType, actionTaken = 'allowed', details = '', extra = {}) => {
    return logSecurityEvent({
        eventType,
        ipAddress: getClientIP(req),
        email: req.body?.email || '',
        userAgent: req.headers['user-agent'] || '',
        actionTaken,
        details,
        ...extra
    });
};

module.exports = {
    getClientIP,
    logSecurityEvent,
    logFromRequest
};
