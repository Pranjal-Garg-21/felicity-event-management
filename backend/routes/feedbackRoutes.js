const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/feedback/:eventId
// @desc    Submit anonymous feedback for an event
// @access  Private (Participant only)
router.post('/:eventId', protect, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating, comment } = req.body;
        const participantId = req.user._id;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if event has ended
        const now = new Date();
        if (new Date(event.endDate) > now) {
            return res.status(400).json({ message: 'Cannot submit feedback for ongoing events' });
        }

        // Check if participant attended the event
        const attended = event.participants.some(p => p.toString() === participantId.toString());
        if (!attended) {
            return res.status(403).json({ message: 'You can only provide feedback for events you attended' });
        }

        // Check for duplicate feedback
        const existingFeedback = await Feedback.findOne({ eventId, participantId });
        if (existingFeedback) {
            return res.status(400).json({ message: 'You have already submitted feedback for this event' });
        }

        // Create feedback
        const feedback = await Feedback.create({
            eventId,
            participantId,
            rating,
            comment: comment || '',
            isAnonymous: true
        });

        console.log('✅ Feedback created:', {
            feedbackId: feedback._id,
            eventId: feedback.eventId,
            rating: feedback.rating,
            hasComment: !!feedback.comment
        });

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedback: {
                rating: feedback.rating,
                comment: feedback.comment,
                createdAt: feedback.createdAt
            }
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/feedback/event/:eventId
// @desc    Get all anonymous feedback for an event (Organizer view)
// @access  Private (Organizer only)
router.get('/event/:eventId', protect, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating } = req.query; // Optional filter by rating

        // Check if event exists and user is the organizer
        const event = await Event.findById(eventId).populate('organizer');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Verify organizer or admin
        if (event.organizer._id.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to view this feedback' });
        }

        // Build query
        const query = { eventId };
        if (rating) {
            query.rating = parseInt(rating);
        }

        // Get feedback (excluding participantId for anonymity)
        const feedbackList = await Feedback.find(query)
            .select('rating comment createdAt')  // Only select fields we want (don't include participantId)
            .sort({ createdAt: -1 });

        console.log('📊 Fetching feedback for event:', eventId);
        console.log('📊 Filter:', rating ? `rating=${rating}` : 'all');
        console.log('📊 Found:', feedbackList.length, 'feedback entries');

        res.json(feedbackList);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/feedback/event/:eventId/stats
// @desc    Get aggregated feedback statistics for an event
// @access  Private (Organizer only)
router.get('/event/:eventId/stats', protect, async (req, res) => {
    try {
        const { eventId } = req.params;

        // Check if event exists and user is the organizer
        const event = await Event.findById(eventId).populate('organizer');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Verify organizer or admin
        if (event.organizer._id.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to view this feedback' });
        }

        // Get all feedback for this event
        const feedbackList = await Feedback.find({ eventId });

        // Calculate statistics
        const totalFeedback = feedbackList.length;
        const totalParticipants = event.participants.length;

        if (totalFeedback === 0) {
            return res.json({
                totalFeedback: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                responseRate: 0,
                totalParticipants
            });
        }

        // Calculate average rating
        const totalRating = feedbackList.reduce((sum, f) => sum + f.rating, 0);
        const averageRating = (totalRating / totalFeedback).toFixed(2);

        // Calculate rating distribution
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        feedbackList.forEach(f => {
            ratingDistribution[f.rating]++;
        });

        // Calculate response rate
        const responseRate = totalParticipants > 0
            ? ((totalFeedback / totalParticipants) * 100).toFixed(1)
            : 0;

        res.json({
            totalFeedback,
            averageRating: parseFloat(averageRating),
            ratingDistribution,
            responseRate: parseFloat(responseRate),
            totalParticipants
        });
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/feedback/event/:eventId/export
// @desc    Export feedback as CSV
// @access  Private (Organizer only)
router.get('/event/:eventId/export', protect, async (req, res) => {
    try {
        const { eventId } = req.params;

        // Check if event exists and user is the organizer
        const event = await Event.findById(eventId).populate('organizer');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Verify organizer or admin
        if (event.organizer._id.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to export this feedback' });
        }

        // Get all feedback
        const feedbackList = await Feedback.find({ eventId })
            .select('rating comment createdAt')
            .sort({ createdAt: -1 });

        // Generate CSV content
        let csv = 'Rating,Comment,Date\n';
        feedbackList.forEach(feedback => {
            const date = new Date(feedback.createdAt).toLocaleDateString();
            const comment = feedback.comment.replace(/"/g, '""'); // Escape quotes
            csv += `${feedback.rating},"${comment}",${date}\n`;
        });

        // Set headers for file download
        const filename = `${event.name.replace(/[^a-z0-9]/gi, '_')}-feedback-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(csv);
    } catch (error) {
        console.error('Error exporting feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/feedback/my-feedback/:eventId
// @desc    Check if participant has already submitted feedback
// @access  Private (Participant)
router.get('/my-feedback/:eventId', protect, async (req, res) => {
    try {
        const { eventId } = req.params;
        const participantId = req.user._id;

        const feedback = await Feedback.findOne({ eventId, participantId });

        res.json({
            hasSubmitted: !!feedback,
            feedback: feedback ? {
                rating: feedback.rating,
                comment: feedback.comment,
                createdAt: feedback.createdAt
            } : null
        });
    } catch (error) {
        console.error('Error checking feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/feedback/can-submit/:eventId
// @desc    Check if participant can submit feedback
// @access  Private (Participant)
router.get('/can-submit/:eventId', protect, async (req, res) => {
    try {
        const { eventId } = req.params;
        const participantId = req.user._id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if event has ended
        const hasEnded = new Date(event.endDate) < new Date();

        // Check if participant attended
        const attended = event.participants.some(p => p.toString() === participantId.toString());

        // Check if already submitted
        const existingFeedback = await Feedback.findOne({ eventId, participantId });

        res.json({
            canSubmit: hasEnded && attended && !existingFeedback,
            hasEnded,
            attended,
            alreadySubmitted: !!existingFeedback
        });
    } catch (error) {
        console.error('Error checking eligibility:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
