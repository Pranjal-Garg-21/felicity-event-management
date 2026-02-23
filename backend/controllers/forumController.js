const ForumMessage = require('../models/ForumMessage');
const Event = require('../models/Event');
const User = require('../models/User');
const { sendAnnouncementToDiscord } = require('../utils/discordWebhook');

// @desc    Get all messages for an event
// @route   GET /api/forum/:eventId
// @access  Private (Registered participants + Organizer)
exports.getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Verify event exists and user has access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is registered or is the organizer
    const isOrganizer = event.organizer.toString() === req.user._id.toString();
    const isParticipant = event.participants.some(p => p.toString() === req.user._id.toString());

    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ message: 'You must be registered for this event to view the forum' });
    }

    // Get top-level messages (not replies)
    const messages = await ForumMessage.find({
      eventId,
      parentMessageId: null,
      isDeleted: false
    })
      .populate('author', 'firstName lastName email role organizerName')
      .populate('reactions.userId', 'firstName lastName')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Get reply counts for each message
    const messagesWithReplies = await Promise.all(
      messages.map(async (msg) => {
        const replyCount = await ForumMessage.countDocuments({
          parentMessageId: msg._id,
          isDeleted: false
        });
        return {
          ...msg.toObject(),
          replyCount
        };
      })
    );

    res.json({
      messages: messagesWithReplies,
      total: await ForumMessage.countDocuments({ eventId, parentMessageId: null, isDeleted: false })
    });
  } catch (error) {
    console.error('Error fetching forum messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get replies to a message
// @route   GET /api/forum/message/:messageId/replies
// @access  Private
exports.getMessageReplies = async (req, res) => {
  try {
    const { messageId } = req.params;

    const replies = await ForumMessage.find({
      parentMessageId: messageId,
      isDeleted: false
    })
      .populate('author', 'firstName lastName email role organizerName')
      .populate('reactions.userId', 'firstName lastName')
      .sort({ createdAt: 1 });

    res.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Post a new message
// @route   POST /api/forum/:eventId
// @access  Private (Registered participants + Organizer)
exports.postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, type, parentMessageId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ message: 'Message is too long (max 2000 characters)' });
    }

    // Verify event exists and user has access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isOrganizer = event.organizer.toString() === req.user._id.toString();
    const isParticipant = event.participants.some(p => p.toString() === req.user._id.toString());

    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ message: 'You must be registered for this event to post' });
    }

    // Only organizers can post announcements
    if (type === 'announcement' && !isOrganizer) {
      return res.status(403).json({ message: 'Only organizers can post announcements' });
    }

    // If replying, verify parent message exists
    if (parentMessageId) {
      const parentMessage = await ForumMessage.findById(parentMessageId);
      if (!parentMessage || parentMessage.eventId.toString() !== eventId) {
        return res.status(404).json({ message: 'Parent message not found' });
      }

      // Update parent reply count
      parentMessage.replyCount += 1;
      parentMessage.lastActivityAt = new Date();
      await parentMessage.save();
    }

    const message = await ForumMessage.create({
      eventId,
      author: req.user._id,
      content,
      type: type || 'message',
      parentMessageId: parentMessageId || null
    });

    const populatedMessage = await ForumMessage.findById(message._id)
      .populate('author', 'firstName lastName email role organizerName')
      .populate('reactions.userId', 'firstName lastName');

    console.log(`📝 New forum message posted in event ${eventId} by ${req.user.firstName} ${req.user.lastName}`);

    // Send notifications to all participants if this is an announcement
    if (type === 'announcement' && !parentMessageId) {
      console.log('📢 Sending announcement notifications...');

      // 1. Post to Discord (Non-blocking)
      const organizer = await User.findById(req.user._id);
      sendAnnouncementToDiscord(event, organizer?.organizerName || 'Organizer', content)
        .catch(err => console.error('Discord announcement failed (non-blocking):', err));

      // 2. Internal notifications for all participants
      const participantIds = event.participants.filter(
        pid => pid.toString() !== req.user._id.toString()
      );

      if (participantIds.length > 0) {
        // Create notification object
        const notification = {
          type: 'announcement',
          eventId: event._id,
          eventName: event.name,
          messageId: message._id,
          title: `New Announcement: ${event.name}`,
          content: content.length > 100 ? content.substring(0, 100) + '...' : content,
          read: false,
          createdAt: new Date()
        };

        // Add notification to all participants
        await User.updateMany(
          { _id: { $in: participantIds } },
          { $push: { notifications: notification } }
        );

        console.log(`✅ Sent internal announcement notifications to ${participantIds.length} participant(s)`);
      }
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add reaction to a message
// @route   POST /api/forum/message/:messageId/react
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reactionType } = req.body;

    const validReactions = ['like', 'love', 'helpful', 'question', 'celebrate'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const message = await ForumMessage.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted
    const existingReaction = message.reactions.find(
      r => r.userId.toString() === req.user._id.toString()
    );

    if (existingReaction) {
      // Update existing reaction
      existingReaction.type = reactionType;
      existingReaction.createdAt = new Date();
    } else {
      // Add new reaction
      message.reactions.push({
        type: reactionType,
        userId: req.user._id
      });
    }

    await message.save();

    const updatedMessage = await ForumMessage.findById(messageId)
      .populate('author', 'firstName lastName email role organizerName')
      .populate('reactions.userId', 'firstName lastName');

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove reaction from a message
// @route   DELETE /api/forum/message/:messageId/react
// @access  Private
exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== req.user._id.toString()
    );

    await message.save();

    const updatedMessage = await ForumMessage.findById(messageId)
      .populate('author', 'firstName lastName email role organizerName')
      .populate('reactions.userId', 'firstName lastName');

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Pin/Unpin a message (Organizer only)
// @route   PUT /api/forum/message/:messageId/pin
// @access  Private (Organizer)
exports.togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ForumMessage.findById(messageId).populate('author', 'firstName lastName');
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is the event organizer
    const event = await Event.findById(message.eventId);
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the event organizer can pin messages' });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    console.log(`📌 Message ${message.isPinned ? 'pinned' : 'unpinned'} by organizer`);

    res.json(message);
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a message (Organizer or author)
// @route   DELETE /api/forum/message/:messageId
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ForumMessage.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is the event organizer or the message author
    const event = await Event.findById(message.eventId);
    const isOrganizer = event.organizer.toString() === req.user._id.toString();
    const isAuthor = message.author.toString() === req.user._id.toString();

    if (!isOrganizer && !isAuthor) {
      return res.status(403).json({ message: 'You can only delete your own messages or messages in your event' });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();

    console.log(`🗑️ Message deleted by ${isOrganizer ? 'organizer' : 'author'}`);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unread message count for user
// @route   GET /api/forum/:eventId/unread
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { lastViewed } = req.query;

    if (!lastViewed) {
      return res.json({ unreadCount: 0 });
    }

    const unreadCount = await ForumMessage.countDocuments({
      eventId,
      isDeleted: false,
      createdAt: { $gt: new Date(lastViewed) }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
