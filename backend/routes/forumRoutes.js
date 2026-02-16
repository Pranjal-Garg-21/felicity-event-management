const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getEventMessages,
  getMessageReplies,
  postMessage,
  addReaction,
  removeReaction,
  togglePinMessage,
  deleteMessage,
  getUnreadCount
} = require('../controllers/forumController');

// Get all messages for an event
router.get('/:eventId', protect, getEventMessages);

// Get unread count
router.get('/:eventId/unread', protect, getUnreadCount);

// Post a new message
router.post('/:eventId', protect, postMessage);

// Get replies to a message
router.get('/message/:messageId/replies', protect, getMessageReplies);

// Add/update reaction
router.post('/message/:messageId/react', protect, addReaction);

// Remove reaction
router.delete('/message/:messageId/react', protect, removeReaction);

// Pin/unpin message (organizer only)
router.put('/message/:messageId/pin', protect, togglePinMessage);

// Delete message
router.delete('/message/:messageId', protect, deleteMessage);

module.exports = router;
