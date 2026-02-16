const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- Common Fields ---
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Participant', 'Organizer', 'Admin'], 
    required: true 
  },
  contactNumber: { type: String },

  // --- Participant Specific (Section 6.1) ---
  firstName: { type: String },
  lastName: { type: String },
  contactNumber: { type: String },
  participantType: { type: String, enum: ['IIIT', 'Non-IIIT'] },
  collegeName: { type: String },
  interests: { type: [String], default: [] },
  followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hasCompletedOnboarding: { type: Boolean, default: false },
  
  // Ticket History for registered events
  eventTickets: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    ticketId: { type: String },
    registeredAt: { type: Date, default: Date.now },
    emailSent: { type: Boolean, default: false },
    // Attendance tracking
    attended: { type: Boolean, default: false },
    attendedAt: { type: Date },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Organizer who scanned
    scanMethod: { type: String, enum: ['Camera', 'FileUpload', 'Manual'], default: 'Camera' },
    manualOverride: { type: Boolean, default: false },
    manualOverrideReason: { type: String },
    manualOverrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Team invitations received
  teamInvites: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    teamId: { type: String }, // Team registration ID
    inviteCode: { type: String },
    teamName: { type: String },
    teamLeaderName: { type: String },
    teamLeaderEmail: { type: String },
    status: { 
      type: String, 
      enum: ['Pending', 'Accepted', 'Declined'], 
      default: 'Pending' 
    },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date }
  }],

  // Notifications for forum announcements
  notifications: [{
    type: { type: String, enum: ['announcement', 'team_invite', 'event_update'], default: 'announcement' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    eventName: { type: String },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumMessage' },
    title: { type: String },
    content: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],

  // --- Organizer Specific (Section 6.2) ---
  organizerName: { type: String },
  category: { type: String },
  description: { type: String },
  contactEmail: { type: String }, // Separate from login email; editable contact email
  discordWebhook: { type: String },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  
  // Active password reset request
  resetRequest: {
    reason: { type: String, default: null },
    requestedAt: { type: Date, default: null },
    status: { type: String, enum: ['None', 'Pending', 'Approved', 'Rejected'], default: 'None' }
  },
  
  // Password reset history
  resetHistory: [{
    reason: { type: String },
    requestedAt: { type: Date },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who processed
    status: { type: String, enum: ['Approved', 'Rejected'] },
    adminComment: { type: String },
    generatedPassword: { type: String } // Store temporarily for admin to share
  }]
});

module.exports = mongoose.model('User', userSchema);