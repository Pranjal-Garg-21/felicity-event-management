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
      email, 
      password, 
      category, 
      description, 
      orgContactNumber 
    } = req.body;

    // 1. Check if Organizer already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // 2. Hash the auto-generated or provided password [cite: 42, 67]
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create the Organizer [cite: 62, 63, 146]
    const organizer = await User.create({
      email,
      password: hashedPassword,
      role: 'Organizer', // Role switching strictly prohibited 
      organizerName,
      category,
      description,
      contactNumber: orgContactNumber // Reusing the common contact field
    });

    res.status(201).json({
      message: "Organizer account provisioned successfully",
      organizer: {
        id: organizer._id,
        name: organizer.organizerName,
        email: organizer.email
      }
    });
  } catch (error) {
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
exports.deleteOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;
    
    // First, delete all events created by this organizer
    await Event.deleteMany({ organizer: organizerId });
    
    // Then delete the organizer
    await User.findByIdAndDelete(organizerId);
    
    res.json({ message: "Organizer and all their events removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
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