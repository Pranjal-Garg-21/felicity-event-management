const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');

// @desc    Get all organizers (with search logic)
router.get('/organizers', protect, async (req, res) => {
  try {
    const { search } = req.query; // Captures search param from frontend
    let query = { role: 'Organizer' };

    if (search) {
      // Direct Database Match using Regex
      query.$or = [
        { organizerName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const organizers = await User.find(query)
      .select('organizerName category description followers');
    res.json(organizers);
  } catch (err) {
    res.status(500).json({ message: "Error fetching clubs" });
  }
});

// @desc    Get Organizer Profile with Follower Details
// This MUST be a separate path: /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const profile = await User.findById(req.user.id)
      .populate('followers', 'firstName lastName email')
      .populate('followedClubs', 'organizerName category description');
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// @desc    Update Organizer Profile (editable fields only)
// @route   PUT /api/users/organizer-profile
// @access  Private (Organizer only)
router.put('/organizer-profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'Organizer') {
      return res.status(403).json({ message: 'Only organizers can update their profile' });
    }

    const { organizerName, category, description, contactNumber, contactEmail } = req.body;

    // Editable fields — login email is NOT editable
    if (organizerName !== undefined) user.organizerName = organizerName;
    if (category !== undefined) user.category = category;
    if (description !== undefined) user.description = description;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (contactEmail !== undefined) user.contactEmail = contactEmail;
    if (contactEmail !== undefined) user.contactEmail = contactEmail;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      profile: {
        organizerName: user.organizerName,
        category: user.category,
        description: user.description,
        email: user.email, // login email — read-only
        contactNumber: user.contactNumber,
        contactEmail: user.contactEmail,
        contactEmail: user.contactEmail
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// backend/routes/userRoutes.js

router.post('/follow/:id', protect, async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id);
    const student = await User.findById(req.user.id);

    if (!organizer || organizer.role !== 'Organizer') {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Use .some() with .toString() for accurate ID comparison
    const isFollowing = organizer.followers.some(id => id.toString() === req.user.id.toString());

    if (isFollowing) {
      // Unfollow logic
      organizer.followers = organizer.followers.filter(id => id.toString() !== req.user.id.toString());
      student.followedClubs = student.followedClubs.filter(id => id.toString() !== req.params.id.toString());
    } else {
      // Follow logic
      organizer.followers.push(req.user.id);
      student.followedClubs.push(req.params.id);
    }

    await organizer.save();
    await student.save();

    // Return the updated followers list for frontend state sync
    res.json({ followers: organizer.followers });
  } catch (err) {
    res.status(500).json({ message: "Follow action failed" });
  }
});

// backend/routes/userRoutes.js
router.put('/update-onboarding', protect, async (req, res) => {
  try {
    const { interests, followedClubs, hasCompletedOnboarding } = req.body;

    // Get current user to check previous followedClubs
    const currentUser = await User.findById(req.user.id);
    const previousClubs = currentUser.followedClubs || [];
    const newClubs = followedClubs || [];

    // Update user with interests and onboarding status
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        interests: interests || [],
        followedClubs: newClubs,
        hasCompletedOnboarding: hasCompletedOnboarding
      },
      { new: true }
    ).select('-password').populate('followedClubs', 'organizerName category description');

    // Find clubs to add (in new but not in previous)
    const clubsToAdd = newClubs.filter(id => !previousClubs.some(prevId => prevId.toString() === id.toString()));

    // Find clubs to remove (in previous but not in new)
    const clubsToRemove = previousClubs.filter(prevId => !newClubs.some(id => id.toString() === prevId.toString()));

    // Add user to followers list of newly followed clubs
    if (clubsToAdd.length > 0) {
      await Promise.all(
        clubsToAdd.map(async (clubId) => {
          const organizer = await User.findById(clubId);
          if (organizer && !organizer.followers.some(id => id.toString() === req.user.id.toString())) {
            organizer.followers.push(req.user.id);
            await organizer.save();
          }
        })
      );
    }

    // Remove user from followers list of unfollowed clubs
    if (clubsToRemove.length > 0) {
      await Promise.all(
        clubsToRemove.map(async (clubId) => {
          const organizer = await User.findById(clubId);
          if (organizer) {
            organizer.followers = organizer.followers.filter(id => id.toString() !== req.user.id.toString());
            await organizer.save();
          }
        })
      );
    }

    res.json(user);
  } catch (err) {
    console.error("Onboarding update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

// @desc    Get Participant's Ticket History
router.get('/my-tickets', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'eventTickets.eventId',
        select: 'name type startDate endDate venue organizer registrationFee teamRegistrations',
        populate: {
          path: 'organizer',
          select: 'organizerName'
        }
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return empty array if no tickets yet
    if (!user.eventTickets || user.eventTickets.length === 0) {
      return res.json([]);
    }

    // Filter out tickets for deleted events and map to plain objects
    const validTickets = user.eventTickets
      .filter(ticket => ticket.eventId !== null)
      .map(ticket => ticket.toObject());

    // Enrich tickets with Team Name if applicable
    for (const ticket of validTickets) {
      const event = ticket.eventId;
      if (event && event.type === 'Team' && event.teamRegistrations) {
        // Find the team this user is a member of
        const userTeam = event.teamRegistrations.find(team =>
          team.members.some(member => member.email.toLowerCase() === user.email.toLowerCase()) ||
          team.teamLeaderEmail.toLowerCase() === user.email.toLowerCase()
        );

        if (userTeam) {
          ticket.teamName = userTeam.teamName;
        }

        // Remove teamRegistrations from response to reduce payload size
        delete ticket.eventId.teamRegistrations;
      }
    }

    res.json(validTickets);
  } catch (err) {
    console.error("Error fetching ticket history:", err);
    res.status(500).json({ message: "Error fetching ticket history" });
  }
});

// @route   GET /api/users/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Sort by createdAt descending (newest first)
    const sortedNotifications = user.notifications.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(sortedNotifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// @route   PUT /api/users/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/notifications/:notificationId/read', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notification = user.notifications.id(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await user.save();

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// @route   DELETE /api/users/notifications/:notificationId
// @desc    Delete a notification
// @access  Private
router.delete('/notifications/:notificationId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.notifications = user.notifications.filter(
      n => n._id.toString() !== req.params.notificationId
    );

    await user.save();

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

module.exports = router;