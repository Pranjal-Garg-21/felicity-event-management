const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    isAnonymous: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index to prevent duplicate feedback from same participant for same event
feedbackSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

// Index for querying feedback by rating
feedbackSchema.index({ eventId: 1, rating: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
