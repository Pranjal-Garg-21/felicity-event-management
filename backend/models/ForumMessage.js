const mongoose = require('mongoose');

const forumMessageSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['message', 'announcement', 'question'],
    default: 'message'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Threading support
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumMessage',
    default: null
  },
  replyCount: {
    type: Number,
    default: 0
  },
  
  // Reactions
  reactions: [{
    type: {
      type: String,
      enum: ['like', 'love', 'helpful', 'question', 'celebrate'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  editedAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
forumMessageSchema.index({ eventId: 1, createdAt: -1 });
forumMessageSchema.index({ eventId: 1, isPinned: -1, createdAt: -1 });
forumMessageSchema.index({ parentMessageId: 1 });

// Virtual for reply messages
forumMessageSchema.virtual('replies', {
  ref: 'ForumMessage',
  localField: '_id',
  foreignField: 'parentMessageId'
});

module.exports = mongoose.model('ForumMessage', forumMessageSchema);
