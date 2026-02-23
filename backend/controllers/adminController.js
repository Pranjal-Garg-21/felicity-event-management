const User = require('../models/User');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');

// @desc    Admin creates a new Organizer account
// @route   POST /api/admin/create-organizer
// @access  Private (Admin only)
exports.createOrganizer = async (req, res) => {
  try {
    const {
      organizerName,
      manualPassword, // Optional: Admin can provide specific password
      category,
      description,
      orgContactNumber
    } = req.body;

    // 1. Auto-generate Email from Club Name
    // Remove spaces, special chars, convert to lowercase
    const cleanName = organizerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanName}@clubs.iiit.ac.in`;

    // 2. Check if Organizer/Email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: `Club account '${email}' already exists` });
    }

    // 3. Determine Password (Manual vs Random)
    let password = manualPassword;

    if (!password || typeof password !== 'string' || password.trim() === '') {
      try {
        password = generateSecurePassword();
        console.log(`[DEBUG] Generated new password: ${password ? 'YES' : 'NO'}`);
      } catch (genError) {
        console.error("Error generating password:", genError);
        return res.status(500).json({ message: "Failed to generate password" });
      }
    }

    if (!password) {
      console.error("[ERROR] Password is null/undefined before hashing");
      return res.status(500).json({ message: "Password generation failed" });
    }

    // 4. Hash the password (Sync to avoid async issues)
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // 5. Create the Organizer
    const organizer = await User.create({
      email,
      password: hashedPassword,
      role: 'Organizer',
      organizerName,
      category,
      description,
      contactNumber: orgContactNumber
    });

    res.status(201).json({
      message: "Organizer account created successfully",
      organizer: {
        id: organizer._id,
        name: organizer.organizerName,
        email: organizer.email,
        password: password // Return plain password ONLY here for Admin to see once
      }
    });
  } catch (error) {
    console.error("Create organizer error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all organizers
exports.getAllOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'Organizer' }).select('-password');
    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete organizer
// Hard Delete Organizer & Cleanup
exports.deleteOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;

    // 1. Find all events by this organizer
    const events = await Event.find({ organizer: organizerId });
    const eventIds = events.map(e => e._id);

    // 2. Remove all related data from Users (Tickets, Notifications, Invites) for these events
    if (eventIds.length > 0) {
      await User.updateMany({}, {
        $pull: {
          eventTickets: { eventId: { $in: eventIds } },
          notifications: { eventId: { $in: eventIds } },
          teamInvites: { eventId: { $in: eventIds } }
        }
      });
    }

    // 3. Remove Organizer from all Users' followedClubs
    await User.updateMany({}, {
      $pull: { followedClubs: organizerId }
    });

    // 4. Delete all events
    await Event.deleteMany({ organizer: organizerId });

    // 5. Delete the organizer user
    const deletedUser = await User.findByIdAndDelete(organizerId);

    if (!deletedUser) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    console.log(`🗑️ Hard deleted organizer ${deletedUser.email} and ${eventIds.length} events.`);
    res.json({ message: "Organizer and all their data permanently removed." });
  } catch (error) {
    console.error("Delete organizer error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Hard Delete Event & Cleanup
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    // 1. Delete the Event document
    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // 2. Remove all references from Users
    await User.updateMany({}, {
      $pull: {
        eventTickets: { eventId: eventId },
        notifications: { eventId: eventId },
        teamInvites: { eventId: eventId }
      }
    });

    console.log(`🗑️ Hard deleted event ${event.name} (${eventId}) and cleaned up references.`);
    res.json({ message: "Event permanently deleted and removed from all dashboards." });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: "Error deleting event" });
  }
};

// Fetch all users who have a 'Pending' reset status
// @desc    Get all pending password reset requests
// @route   GET /api/admin/reset-requests
// @access  Private (Admin)
exports.getResetRequests = async (req, res) => {
  try {
    const requests = await User.find({
      role: 'Organizer',
      "resetRequest.status": "Pending"
    }).select('-password');

    // Format the response
    const formattedRequests = requests.map(user => ({
      _id: user._id,
      clubName: user.organizerName,
      email: user.email,
      category: user.category,
      reason: user.resetRequest.reason,
      requestedAt: user.resetRequest.requestedAt,
      status: user.resetRequest.status
    }));

    console.log(`📋 Fetched ${formattedRequests.length} pending password reset requests`);
    res.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching reset requests:', error);
    res.status(500).json({ message: "Error fetching requests" });
  }
};

// @desc    Get password reset history for an organizer
// @route   GET /api/admin/reset-history/:userId
// @access  Private (Admin)
exports.getResetHistory = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('organizerName email resetHistory')
      .populate('resetHistory.processedBy', 'email');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      clubName: user.organizerName,
      email: user.email,
      history: user.resetHistory
    });
  } catch (error) {
    console.error('Error fetching reset history:', error);
    res.status(500).json({ message: "Error fetching history" });
  }
};

// @desc    Process password reset request (Approve/Reject)
// @route   POST /api/admin/handle-reset
// @access  Private (Admin)
exports.handleResetAction = async (req, res) => {
  const { userId, action, adminComment } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.resetRequest.status !== 'Pending') {
      return res.status(400).json({ message: "No pending reset request for this user" });
    }

    let generatedPassword = null;

    if (action === 'approve') {
      // Auto-generate a secure random password
      generatedPassword = generateSecurePassword();

      // Hash the new password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(generatedPassword, salt);

      console.log(`✅ Password reset approved for ${user.organizerName}`);
      console.log(`🔑 Generated password: ${generatedPassword}`);
    } else {
      console.log(`❌ Password reset rejected for ${user.organizerName}`);
    }

    // Add to history
    user.resetHistory.push({
      reason: user.resetRequest.reason,
      requestedAt: user.resetRequest.requestedAt,
      processedAt: new Date(),
      processedBy: req.user._id,
      status: action === 'approve' ? 'Approved' : 'Rejected',
      adminComment: adminComment || '',
      generatedPassword: action === 'approve' ? generatedPassword : null
    });

    // Clear the current request
    user.resetRequest = {
      reason: null,
      requestedAt: null,
      status: 'None'
    };

    await user.save();

    res.json({
      message: `Password reset ${action}ed successfully`,
      generatedPassword: action === 'approve' ? generatedPassword : null,
      clubName: user.organizerName,
      email: user.email
    });
  } catch (error) {
    console.error('Error in handleResetAction:', error);
    res.status(500).json({ message: "Server error during reset action" });
  }
};

// Helper function to generate secure password
function generateSecurePassword() {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}