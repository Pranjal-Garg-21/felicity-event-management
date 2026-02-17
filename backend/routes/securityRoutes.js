const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SecurityEvent = require('../models/SecurityEvent');
const BlockedIP = require('../models/BlockedIP');
const { logSecurityEvent } = require('../utils/securityLogger');

// Admin-only middleware
const adminOnly = async (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        return next();
    }
    return res.status(403).json({ message: 'Admin access required' });
};

// @route   GET /api/security/events
// @desc    Get security events (paginated, filtered)
// @access  Admin only
router.get('/events', protect, adminOnly, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            eventType,
            ipAddress,
            email,
            actionTaken,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter query
        const query = {};
        if (eventType) query.eventType = eventType;
        if (ipAddress) query.ipAddress = { $regex: ipAddress, $options: 'i' };
        if (email) query.email = { $regex: email, $options: 'i' };
        if (actionTaken) query.actionTaken = actionTaken;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [events, total] = await Promise.all([
            SecurityEvent.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
            SecurityEvent.countDocuments(query)
        ]);

        res.json({
            events,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching security events:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/security/stats
// @desc    Get security statistics
// @access  Admin only
router.get('/stats', protect, adminOnly, async (req, res) => {
    try {
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);
        const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const [
            total24h,
            total7d,
            total30d,
            failedLogins24h,
            failedLogins7d,
            blockedIPs,
            highRiskEvents,
            eventTypeCounts,
            recentBlockedIPs,
            topSuspiciousIPs
        ] = await Promise.all([
            SecurityEvent.countDocuments({ createdAt: { $gte: last24h } }),
            SecurityEvent.countDocuments({ createdAt: { $gte: last7d } }),
            SecurityEvent.countDocuments({ createdAt: { $gte: last30d } }),
            SecurityEvent.countDocuments({ eventType: 'failed_login', createdAt: { $gte: last24h } }),
            SecurityEvent.countDocuments({ eventType: 'failed_login', createdAt: { $gte: last7d } }),
            BlockedIP.countDocuments({ expiresAt: { $gt: now } }),
            SecurityEvent.countDocuments({
                eventType: { $in: ['brute_force_detected', 'suspicious_activity'] },
                createdAt: { $gte: last7d }
            }),
            SecurityEvent.aggregate([
                { $match: { createdAt: { $gte: last7d } } },
                { $group: { _id: '$eventType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            BlockedIP.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 }).limit(10),
            SecurityEvent.aggregate([
                { $match: { createdAt: { $gte: last7d }, actionTaken: { $in: ['blocked', 'rate_limited'] } } },
                { $group: { _id: '$ipAddress', count: { $sum: 1 }, lastSeen: { $max: '$createdAt' } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        res.json({
            overview: {
                total24h, total7d, total30d,
                failedLogins24h, failedLogins7d,
                blockedIPs,
                highRiskEvents
            },
            eventTypeCounts: eventTypeCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            recentBlockedIPs,
            topSuspiciousIPs
        });
    } catch (error) {
        console.error('Error fetching security stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/security/blocked-ips
// @desc    Get currently blocked IPs
// @access  Admin only
router.get('/blocked-ips', protect, adminOnly, async (req, res) => {
    try {
        const blockedIPs = await BlockedIP.find({ expiresAt: { $gt: new Date() } })
            .sort({ createdAt: -1 });
        res.json(blockedIPs);
    } catch (error) {
        console.error('Error fetching blocked IPs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/security/block-ip
// @desc    Manually block an IP
// @access  Admin only
router.post('/block-ip', protect, adminOnly, async (req, res) => {
    try {
        const { ipAddress, reason, duration } = req.body;

        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address is required' });
        }

        const durationMs = (duration || 24) * 60 * 60 * 1000; // Default 24 hours

        const existing = await BlockedIP.findOne({ ipAddress });
        if (existing) {
            existing.reason = reason || 'Manually blocked by admin';
            existing.expiresAt = new Date(Date.now() + durationMs);
            existing.isManual = true;
            existing.blockedBy = req.user.email || 'admin';
            await existing.save();
        } else {
            await BlockedIP.create({
                ipAddress,
                reason: reason || 'Manually blocked by admin',
                expiresAt: new Date(Date.now() + durationMs),
                isManual: true,
                blockedBy: req.user.email || 'admin'
            });
        }

        await logSecurityEvent({
            eventType: 'ip_blocked',
            ipAddress,
            actionTaken: 'blocked',
            details: `Manually blocked by ${req.user.email} for ${duration || 24} hours. Reason: ${reason || 'No reason provided'}`
        });

        res.json({ message: `IP ${ipAddress} blocked for ${duration || 24} hours` });
    } catch (error) {
        console.error('Error blocking IP:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/security/unblock-ip/:ip
// @desc    Unblock an IP
// @access  Admin only
router.delete('/unblock-ip/:ip', protect, adminOnly, async (req, res) => {
    try {
        const ipAddress = req.params.ip;

        const result = await BlockedIP.findOneAndDelete({ ipAddress });
        if (!result) {
            return res.status(404).json({ message: 'IP not found in blocked list' });
        }

        await logSecurityEvent({
            eventType: 'ip_unblocked',
            ipAddress,
            actionTaken: 'allowed',
            details: `Unblocked by ${req.user.email}`
        });

        res.json({ message: `IP ${ipAddress} unblocked successfully` });
    } catch (error) {
        console.error('Error unblocking IP:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
