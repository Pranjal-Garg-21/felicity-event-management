const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    reason: {
        type: String,
        required: true,
        default: 'Exceeded failed login attempts'
    },
    blockedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    isManual: {
        type: Boolean,
        default: false
    },
    blockedBy: {
        type: String,
        default: 'system'
    }
}, {
    timestamps: true
});

// TTL index - auto-remove expired blocks
blockedIPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BlockedIP', blockedIPSchema);
