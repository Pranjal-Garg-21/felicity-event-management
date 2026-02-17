const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        enum: [
            'failed_login',
            'successful_login',
            'failed_register',
            'captcha_failed',
            'captcha_passed',
            'rate_limited',
            'ip_blocked',
            'ip_unblocked',
            'suspicious_activity',
            'brute_force_detected'
        ],
        index: true
    },
    ipAddress: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        default: '',
        index: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    riskScore: {
        type: Number,
        default: null,
        min: 0,
        max: 1
    },
    actionTaken: {
        type: String,
        enum: ['allowed', 'blocked', 'flagged', 'rate_limited'],
        default: 'allowed'
    },
    details: {
        type: String,
        default: ''
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for efficient querying
securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ eventType: 1, createdAt: -1 });
securityEventSchema.index({ ipAddress: 1, createdAt: -1 });

// TTL index - auto-delete events older than 90 days
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
