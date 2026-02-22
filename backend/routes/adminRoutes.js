const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { createOrganizer, getAllOrganizers, deleteOrganizer, deleteEvent, getResetRequests,
  handleResetAction, getResetHistory } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Password reset routes
router.get('/reset-requests', protect, authorize('Admin'), getResetRequests);
router.get('/reset-history/:userId', protect, authorize('Admin'), getResetHistory);
router.post('/handle-reset', protect, authorize('Admin'), handleResetAction);

// Only Admins can create Organizers
router.post('/create-organizer', protect, authorize('Admin'), createOrganizer);
router.get('/organizers', protect, authorize('Admin'), getAllOrganizers);
router.delete('/organizer/:id', protect, authorize('Admin'), deleteOrganizer);

// Get all events (for admin to view all published events)
router.get('/all-events', protect, authorize('Admin'), async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'organizerName email category')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error("Error fetching all events:", error);
    res.status(500).json({ message: "Error fetching events" });
  }
});

// Delete event (admin only)
router.delete('/event/:id', protect, authorize('Admin'), deleteEvent);

module.exports = router;