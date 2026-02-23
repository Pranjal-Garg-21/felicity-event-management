const Event = require('../models/Event');
const User = require('../models/User');
const { sendEventTicket } = require('../utils/emailService');
const { sendEventToDiscord } = require('../utils/discordWebhook');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

exports.createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizer: req.user.id // Pulled from protect middleware
    };

    const event = await Event.create(eventData);

    // If event is published immediately, auto-post to Discord
    console.log(`[DEBUG] New Event Created: ${event.name}, Status: ${event.status}`);
    if (event.status === 'Published') {
      try {
        console.log(`[DEBUG] Triggering Discord auto-post for ${event.name}`);
        const organizer = await User.findById(req.user.id);
        const discordResult = await sendEventToDiscord(null, event, organizer?.organizerName || 'Organizer');
        console.log('Discord auto-post result:', discordResult);
      } catch (discordErr) {
        console.error('Discord auto-post error (non-blocking):', discordErr);
      }
    } else {
      console.log(`[DEBUG] Discord post skipped (status is ${event.status})`);
    }

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    console.log('\n🔵 ===== REGISTRATION STARTED =====');
    console.log('📝 Event ID:', req.params.id);
    console.log('👤 User ID:', req.user.id);
    console.log('👤 User Role:', req.user.role);

    const event = await Event.findById(req.params.id).populate('organizer', 'organizerName category description contactEmail');
    const user = await User.findById(req.user.id);

    console.log('📅 Event Found:', event ? event.name : 'NOT FOUND');
    console.log('👤 User Found:', user ? `${user.firstName} ${user.lastName}` : 'NOT FOUND');

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Check Eligibility (IIIT vs Non-IIIT)
    if (event.eligibility && event.eligibility !== 'Both') {
      const emailDomain = user.email.toLowerCase().split('@')[1];
      const isIIIT = emailDomain === 'students.iiit.ac.in' || emailDomain === 'research.iiit.ac.in';

      if (event.eligibility === 'IIIT' && !isIIIT) {
        return res.status(403).json({
          message: "This event is exclusive to IIIT students/researchers."
        });
      }

      if (event.eligibility === 'Non-IIIT' && isIIIT) {
        return res.status(403).json({
          message: "This event is exclusive to Non-IIIT participants."
        });
      }
    }

    // 2. Block if registration limit reached
    if (event.registrationLimit && event.participants.length >= event.registrationLimit) {
      console.log('❌ Registration limit reached');
      return res.status(400).json({ message: "Registration limit reached!" });
    }

    // 3. Block if merchandise out of stock
    if (event.type === 'Merchandise') {
      const remainingStock = event.merchandiseDetails.stockQuantity - event.soldCount;
      if (remainingStock <= 0) {
        console.log('❌ Merchandise out of stock');
        return res.status(400).json({ message: "Item out of stock!" });
      }
    }

    // 3. Prevent duplicate registration
    const alreadyRegistered = event.participants.some(
      participantId => participantId.toString() === req.user.id.toString()
    );

    if (alreadyRegistered) {
      console.log('❌ User already registered');
      return res.status(400).json({ message: "You are already registered for this event" });
    }

    console.log('✅ Validation passed, adding participant...');

    // 4a. Parse and process form responses (supporting file uploads)
    let customFieldResponses = {};

    // Handle JSON string or object
    if (req.body.formResponses) {
      try {
        customFieldResponses = typeof req.body.formResponses === 'string'
          ? JSON.parse(req.body.formResponses)
          : req.body.formResponses;
      } catch (e) {
        console.error("Error parsing formResponses:", e);
        customFieldResponses = {};
      }
    }

    // Handle File Uploads
    if (req.files && req.files.length > 0) {
      console.log(`📎 Processing ${req.files.length} uploaded files...`);
      for (const file of req.files) {
        // Generate unique filename
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(uploadsDir, fileName);

        // Write buffer to disk
        fs.writeFileSync(filePath, file.buffer);

        // Store relative path (or full URL logic) in responses
        // Key is the field name from form
        customFieldResponses[file.fieldname] = `/uploads/${fileName}`;
        console.log(`✅ Saved file for field '${file.fieldname}': ${fileName}`);
      }
    }

    if (event.customFields && event.customFields.length > 0) {
      // Validate required fields
      for (const field of event.customFields) {
        if (field.isRequired) {
          const value = customFieldResponses[field.fieldName];
          // Check for empty string or null/undefined
          // Note: 0 is valid for number fields
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            return res.status(400).json({
              message: `Required field "${field.fieldName}" is missing. Please fill in all required fields.`
            });
          }
        }
      }
    }


    // Store form response
    const responseEntry = {
      participantId: req.user.id,
      participantEmail: user.email,
      participantName: `${user.firstName} ${user.lastName}`,
      submittedAt: new Date(),
      responses: event.customFields.map(field => ({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        value: customFieldResponses[field.fieldName] ?? ''
      }))
    };
    event.formResponses = event.formResponses || [];
    event.formResponses.push(responseEntry);


    // 4b. Lock the form after first registration
    if (!event.formLocked && event.customFields && event.customFields.length > 0) {
      event.formLocked = true;
    }

    // 5. Update Event - Add participant and update stock for merchandise
    event.participants.push(req.user.id);
    if (event.type === 'Merchandise') {
      event.soldCount = (event.soldCount || 0) + 1;
    }

    console.log('💾 Saving event with new participant...');
    await event.save();
    console.log('✅ Event saved successfully');
    console.log('📊 Total participants now:', event.participants.length);

    // 5. Send Email Ticket (for Normal and Merchandise events)
    let ticketInfo = { success: false };

    console.log('📧 Checking if email should be sent...');
    console.log('Event type:', event.type);

    if (event.type === 'Normal' || event.type === 'Merchandise') {
      console.log('📧 Preparing to send email ticket...');

      const eventDataForEmail = {
        name: event.name,
        id: event._id,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        organizerName: event.organizer.organizerName,
        registrationFee: event.registrationFee,
        eligibility: event.eligibility
      };

      const participantDataForEmail = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      };

      console.log('📧 Calling sendEventTicket function...');
      ticketInfo = await sendEventTicket(participantDataForEmail, eventDataForEmail);
      console.log('📧 Email send result:', ticketInfo);

      // Always store ticket in user's history (even if email fails)
      console.log('💾 Storing ticket in user profile...');
      user.eventTickets = user.eventTickets || [];
      user.eventTickets.push({
        eventId: event._id,
        ticketId: ticketInfo.ticketId || `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        registeredAt: new Date(),
        emailSent: ticketInfo.success
      });
      await user.save();
      console.log('✅ Ticket stored in user profile');

      if (!ticketInfo.success) {
        console.log('⚠️ Email sending failed but ticket record saved');
        console.log('Error:', ticketInfo.error);
      }
    } else {
      console.log('ℹ️ Event type is Team, skipping email');
      // For team events, still store a basic registration record
      user.eventTickets = user.eventTickets || [];
      user.eventTickets.push({
        eventId: event._id,
        ticketId: null,
        registeredAt: new Date(),
        emailSent: false
      });
      await user.save();
    }

    // 6. Success Response
    const responseMessage = event.type === 'Merchandise'
      ? `Purchase successful! ${event.merchandiseDetails.stockQuantity - event.soldCount} items remaining.`
      : "Registration successful!";

    const emailNote = ticketInfo.success
      ? " 📧 Ticket has been sent to your email!"
      : (ticketInfo.error ? " ⚠️ Registration successful but email could not be sent." : "");

    console.log('✅ Registration complete, sending response...');
    console.log('🔵 ===== REGISTRATION ENDED =====\n');

    // Get the latest ticket stored for this user
    const latestTicket = user.eventTickets[user.eventTickets.length - 1];

    res.status(200).json({
      message: responseMessage + emailNote,
      event: {
        eventName: event.name,
        eventDate: event.startDate,
        organizer: event.organizer.organizerName
      },
      ticket: latestTicket ? {
        ticketId: latestTicket.ticketId,
        emailSent: ticketInfo.success
      } : null,
      updatedParticipantCount: event.participants.length,
      updatedSoldCount: event.soldCount || 0
    });

  } catch (error) {
    console.error("❌ Registration error:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ message: error.message });
  }
};