const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // --- Core Mandatory Fields ---
  name: { type: String, required: true },
  description: { type: String, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // --- Event Status ---
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Ongoing', 'Closed'],
    default: 'Draft'
  },
  
  // --- Event Sessions (Multiple dates/times support) ---
  eventSessions: [{
    sessionName: { type: String }, // e.g., "Day 1", "Opening Ceremony"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    venue: { type: String }
  }],
  
  // --- Standard Mandatory Fields ---
  type: { 
    type: String, 
    enum: ['Normal', 'Merchandise', 'Team'], 
    default: 'Normal'
  },
  eligibility: { type: String },
  registrationDeadline: { type: Date },
  registrationLimit: { type: Number },
  registrationFee: { type: Number, default: 0 },
  venue: { type: String },
  
  // --- Optional Standard Fields ---
  tags: { type: [String], default: [] },
  category: { type: String },
  
  // --- Backwards compatibility fields (deprecated but kept for old events) ---
  startDate: { type: Date }, // Use eventSessions instead
  endDate: { type: Date }, // Use eventSessions instead

  // --- Dynamic Custom Fields (Organizer-defined registration form) ---
  customFields: [{
    fieldName: { type: String, required: true },
    fieldType: { type: String, enum: ['Text', 'Number', 'Date', 'Email', 'Phone', 'Dropdown', 'Checkbox', 'Textarea', 'FileUpload'], default: 'Text' },
    isRequired: { type: Boolean, default: false },
    options: [{ type: String }], // For dropdown/checkbox options
    placeholder: { type: String },
    order: { type: Number, default: 0 } // For drag-and-drop reordering
  }],

  // Whether the custom form is locked (auto-set after first registration)
  formLocked: { type: Boolean, default: false },
  
  // --- Participant Responses to Custom Fields ---
  formResponses: [{
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    participantEmail: { type: String },
    participantName: { type: String },
    submittedAt: { type: Date, default: Date.now },
    responses: [{
      fieldName: { type: String },
      fieldType: { type: String },
      value: { type: mongoose.Schema.Types.Mixed } // String, Number, Boolean, Array, or file URL
    }]
  }],

  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  soldCount: { type: Number, default: 0 },
  
  // --- Attendance Tracking ---
  attendanceLog: [{
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participantName: { type: String },
    participantEmail: { type: String },
    ticketId: { type: String },
    scannedAt: { type: Date, default: Date.now },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Organizer
    scanMethod: { type: String, enum: ['Camera', 'FileUpload', 'Manual'], default: 'Camera' },
    isManualOverride: { type: Boolean, default: false },
    overrideReason: { type: String },
    ipAddress: { type: String }
  }],
  
  // --- Team Event Specific ---
  teamDetails: {
    minTeamSize: { type: Number }, // e.g., 2
    maxTeamSize: { type: Number }, // e.g., 4
    requiresPOC: { type: Boolean, default: true }
  },
  
  // Store team registrations with invite-based system
  teamRegistrations: [{
    teamName: { type: String, required: true },
    teamLeaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamLeaderName: { type: String, required: true },
    teamLeaderEmail: { type: String, required: true },
    inviteCode: { type: String, unique: true, sparse: true }, // Unique code for joining
    status: { 
      type: String, 
      enum: ['Pending', 'Complete', 'Cancelled'], 
      default: 'Pending' 
    },
    teamSize: { type: Number, required: true }, // Expected team size
    members: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      email: { type: String, required: true },
      status: { 
        type: String, 
        enum: ['Pending', 'Accepted', 'Declined'], 
        default: 'Pending' 
      },
      invitedAt: { type: Date, default: Date.now },
      respondedAt: { type: Date }
    }],
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }, // When all members accept
    totalFee: { type: Number }
  }],
  
  // --- Merchandise Event Specific (Section 8.1) ---
  merchandiseDetails: {
    itemVariants: [{
      size: { type: String }, // e.g., S, M, L, XL
      color: { type: String },
      variantName: { type: String }
    }],
    stockQuantity: { type: Number },
    purchaseLimitPerUser: { type: Number }
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);