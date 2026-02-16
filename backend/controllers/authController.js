const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to create JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Sessions must persist across restarts 
  });
};



// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });

    // 2. Check if user exists and password matches
    if (user && (await bcrypt.compare(password, user.password))) {
      
      // 3. Role-based access control - validate expected role matches user's actual role
      if (expectedRole && user.role !== expectedRole) {
        console.log(`🚫 Role mismatch: User ${email} has role ${user.role}, tried to login as ${expectedRole}`);
        
        let errorMessage = '';
        if (expectedRole === 'Admin') {
          errorMessage = "Access Denied: Only Admin accounts can login here. Please use the correct login portal.";
        } else if (expectedRole === 'Organizer') {
          errorMessage = "Access Denied: Only Organizer accounts can login here. Please use the correct login portal.";
        } else if (expectedRole === 'Participant') {
          errorMessage = "Access Denied: Only Participant accounts can login here. Please use the correct login portal.";
        }
        
        return res.status(403).json({ message: errorMessage });
      }
      
      const responseData = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding || false,
        token: generateToken(user._id, user.role),
      };

      // Include organizer-specific fields
      if (user.role === 'Organizer') {
        responseData.organizerName = user.organizerName;
        responseData.category = user.category;
        responseData.description = user.description;
        responseData.contactNumber = user.contactNumber;
        responseData.contactEmail = user.contactEmail;
        responseData.discordWebhook = user.discordWebhook;
      }

      console.log(`✅ Login successful: ${user.email} as ${user.role}`);
      res.json(responseData);
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request password reset (Organizer only)
// @route   POST /api/auth/request-reset
// @access  Private (Organizer)
exports.requestPasswordReset = async (req, res) => {
  const { reason } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (user.role !== 'Organizer') {
      return res.status(403).json({ message: "Only organizers can request password reset" });
    }
    
    // Check if already has pending request
    if (user.resetRequest.status === 'Pending') {
      return res.status(400).json({ 
        message: "You already have a pending password reset request. Please wait for admin approval." 
      });
    }
    
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        message: "Please provide a detailed reason (minimum 10 characters)" 
      });
    }

    // Store the password reset request
    user.resetRequest = {
      reason: reason,
      requestedAt: new Date(),
      status: 'Pending'
    };
    
    await user.save();
    
    console.log(`🔐 Password reset requested by ${user.organizerName} (${user.email})`);
    
    res.json({ 
      message: "Password reset request sent to Admin for approval. You will be notified once processed.",
      requestedAt: user.resetRequest.requestedAt
    });
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    res.status(500).json({ message: "Server error during request" });
  }
};
exports.registerParticipant = async (req, res) => {
  try {
    const { firstName, lastName, email, password, contactNumber, participantType, collegeName } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists with this email" });

    // 2. Define mandatory IIIT subdomains
    const allowedIIITDomains = ['@students.iiit.ac.in', '@research.iiit.ac.in'];
    const isIIITDomain = allowedIIITDomains.some(domain => email.toLowerCase().endsWith(domain));

    // 3. Strict Domain Enforcement for IIIT Participants
    if (participantType === 'IIIT' && !isIIITDomain) {
      return res.status(400).json({ message: "IIIT Students must use @students.iiit.ac.in or @research.iiit.ac.in only." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create User with correct metadata
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'Participant',
      isIIITian: isIIITDomain, // Flag for internal pricing/access
      contactNumber,
      // Force college name for internal students; use input for others
      collegeName: isIIITDomain ? 'IIIT Hyderabad' : collegeName,
      participantType: participantType 
    });

    res.status(201).json({
      message: "Participant registered successfully",
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};