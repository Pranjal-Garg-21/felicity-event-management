const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const { createEvent } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { sendTeamEventTickets } = require('../utils/emailService');
const { sendEventToDiscord } = require('../utils/discordWebhook');
const multer = require('multer');
const Jimp = require('jimp');
const jsQR = require('jsqr');

// Multer setup for image upload parsing
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Create Event
router.post('/', protect, authorize('Organizer'), createEvent);

// Get My Events for Organizer (must be before /all to avoid route conflicts)
router.get('/my-events', protect, authorize('Organizer'), async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id })
      .populate('organizer', 'organizerName')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error("Error fetching organizer's events:", error);
    res.status(500).json({ message: "Error fetching your events" });
  }
});

// Get Registered Events for Participant
router.get('/my-registrations', protect, authorize('Participant'), async (req, res) => {
  try {
    console.log('\n📋 Fetching registered events for user:', req.user.id);
    const events = await Event.find({ participants: req.user.id })
      .populate('organizer', 'organizerName email')
      .sort({ startDate: 1 }); // Sort by upcoming events first
    console.log('✅ Found', events.length, 'registered events');
    res.json(events);
  } catch (error) {
    console.error("❌ Error fetching registered events:", error);
    res.status(500).json({ message: "Error fetching your registrations" });
  }
});

// Get All Events for Participants (with search functionality)
router.get('/all', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      // Use Regex for a partial, case-insensitive match in the DB
      query = { name: { $regex: search, $options: 'i' } };
    }

    const events = await Event.find(query)
      .populate('organizer', 'organizerName')
      .select('-formResponses'); // Don't send form responses to participants listing
    res.json(events);
  } catch (error) {
    console.error("Error fetching all events:", error);
    res.status(500).json({ message: "Error fetching events" });
  }
});

// Get Single Event with Participants (for organizers to view details)
router.get('/:id', protect, async (req, res) => {
  try {
    console.log('🔍 GET /api/events/:id called with ID:', req.params.id);
    
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'organizerName email category')
      .populate('participants', 'firstName lastName email contactNumber college rollNumber branch year eventTickets');
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    console.log('📊 Event found:', event.name);
    console.log('👥 Participants count:', event.participants?.length);
    
    // Log first participant's ticket info
    if (event.participants && event.participants.length > 0) {
      const firstP = event.participants[0];
      console.log('🔍 First participant:', firstP.firstName, firstP.lastName);
      console.log('🎫 Their eventTickets:', firstP.eventTickets);
      
      // Check for tickets matching this event
      const thisEventTickets = firstP.eventTickets?.filter(t => 
        t.eventId?.toString() === req.params.id
      );
      console.log('🎫 Tickets for THIS event:', thisEventTickets);
    }
    
    // Check if user is the organizer of this event
    if (req.user.role === 'Organizer' && event.organizer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this event's details" });
    }
    
    res.json(event);
  } catch (error) {
    console.error("Error fetching event details:", error);
    res.status(500).json({ message: "Error fetching event details" });
  }
});

router.post('/register/:id', protect, async (req, res) => {
    // You can call the controller function here
    require('../controllers/eventController').registerForEvent(req, res);
});

// Unregister from an event (only for free events before deadline)
router.post('/unregister/:id', protect, authorize('Participant'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'organizerName');
    if (!event) return res.status(404).json({ message: "Event not found" });

    // 1. Only allow unregistration for free events (fee === 0)
    if (event.registrationFee > 0) {
      return res.status(400).json({ message: "Cannot unregister from paid events. Contact the organizer for a refund." });
    }

    // 2. Only allow if registration deadline hasn't passed
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: "Cannot unregister after the registration deadline has passed." });
    }

    const userId = req.user.id;

    // 3. Check if user is registered at all
    const isRegistered = event.participants.some(id => id.toString() === userId.toString());
    if (!isRegistered) {
      return res.status(400).json({ message: "You are not registered for this event." });
    }

    // 4. Handle Team Events — only POC can unregister, removes all members
    if (event.type === 'Team') {
      // Find the team registration where this user is the POC
      const userDoc = await User.findById(userId);
      const pocTeam = event.teamRegistrations?.find(
        t => t.pocEmail.toLowerCase() === userDoc.email.toLowerCase()
      );

      if (!pocTeam) {
        return res.status(400).json({ 
          message: "Only the Point of Contact (POC) who registered the team can unregister. Contact your team POC." 
        });
      }

      console.log(`👥 POC ${userDoc.email} is unregistering team "${pocTeam.teamName}"`);

      // Collect all team member emails (including any not in members list but who are the POC)
      const allMemberEmails = pocTeam.members.map(m => m.email.toLowerCase());
      if (!allMemberEmails.includes(userDoc.email.toLowerCase())) {
        allMemberEmails.push(userDoc.email.toLowerCase());
      }

      // Find all users matching team member emails
      const matchedUsers = await User.find({ email: { $in: allMemberEmails } });

      // Remove all matched users from event.participants
      for (const memberUser of matchedUsers) {
        event.participants = event.participants.filter(
          id => id.toString() !== memberUser._id.toString()
        );
        // Remove ticket record from their profile
        memberUser.eventTickets = (memberUser.eventTickets || []).filter(
          t => !t.eventId || t.eventId.toString() !== event._id.toString()
        );
        await memberUser.save();
        console.log(`✅ Removed ${memberUser.email} from event and cleared ticket`);
      }

      // Also remove the POC user from participants (in case their email wasn't in the members list)
      event.participants = event.participants.filter(
        id => id.toString() !== userId.toString()
      );
      userDoc.eventTickets = (userDoc.eventTickets || []).filter(
        t => !t.eventId || t.eventId.toString() !== event._id.toString()
      );
      await userDoc.save();

      // Remove the team registration record
      event.teamRegistrations = event.teamRegistrations.filter(
        t => t.pocEmail.toLowerCase() !== userDoc.email.toLowerCase()
      );

      await event.save();
      console.log(`💾 Team "${pocTeam.teamName}" unregistered. Remaining participants: ${event.participants.length}`);

      return res.status(200).json({ 
        message: `Team "${pocTeam.teamName}" has been unregistered. All ${matchedUsers.length} team members have been removed from this event.` 
      });
    }

    // 5. Handle Normal/Merchandise individual unregistration
    // Remove user from participants
    event.participants = event.participants.filter(id => id.toString() !== userId.toString());

    // For merchandise, decrement sold count
    if (event.type === 'Merchandise') {
      event.soldCount = Math.max(0, (event.soldCount || 0) - 1);
    }

    await event.save();

    // Remove ticket record from user's profile
    const userDoc = await User.findById(userId);
    if (userDoc) {
      userDoc.eventTickets = (userDoc.eventTickets || []).filter(
        t => !t.eventId || t.eventId.toString() !== event._id.toString()
      );
      await userDoc.save();
    }

    console.log(`✅ User ${userId} unregistered from event ${event.name}. Remaining participants: ${event.participants.length}`);

    res.status(200).json({ 
      message: `Successfully unregistered from "${event.name}".` 
    });

  } catch (error) {
    console.error("❌ Unregistration error:", error);
    res.status(500).json({ message: error.message || "Error unregistering from event" });
  }
});

// Register Team for Team Event
router.post('/register-team/:id', protect, authorize('Participant'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'organizerName');
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event is a team event
    if (event.type !== 'Team') {
      return res.status(400).json({ message: "This event is not a team event" });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: "Registration deadline has passed" });
    }

    // Check if registration limit reached
    const currentTeams = event.teamRegistrations?.length || 0;
    if (currentTeams >= event.registrationLimit) {
      return res.status(400).json({ message: "Registration limit reached" });
    }

    // Validate team data
    const { teamName, pocName, pocEmail, members, totalFee } = req.body;
    
    if (!teamName || !pocName || !pocEmail || !members || members.length === 0) {
      return res.status(400).json({ message: "All team fields are required" });
    }

    // Validate team size
    const minSize = event.teamDetails?.minTeamSize || 2;
    const maxSize = event.teamDetails?.maxTeamSize || 4;
    
    if (members.length < minSize || members.length > maxSize) {
      return res.status(400).json({ 
        message: `Team size must be between ${minSize} and ${maxSize} members` 
      });
    }

    // Generate a shared team ticket ID
    const teamTicketId = `TEAM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Validate and store custom form responses for team registration
    const customFieldResponses = req.body.formResponses || {};
    if (event.customFields && event.customFields.length > 0) {
      for (const field of event.customFields) {
        if (field.isRequired) {
          const value = customFieldResponses[field.fieldName];
          if (value === undefined || value === null || value === '') {
            return res.status(400).json({ 
              message: `Required field "${field.fieldName}" is missing.` 
            });
          }
        }
      }

      const registeringUser = await User.findById(req.user.id);
      event.formResponses = event.formResponses || [];
      event.formResponses.push({
        participantId: req.user.id,
        participantEmail: registeringUser?.email || pocEmail,
        participantName: `${registeringUser?.firstName || pocName} ${registeringUser?.lastName || ''}`.trim(),
        submittedAt: new Date(),
        responses: event.customFields.map(field => ({
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          value: customFieldResponses[field.fieldName] ?? ''
        }))
      });

      // Lock form after first registration
      if (!event.formLocked) {
        event.formLocked = true;
      }
    }

    // Add team registration record
    event.teamRegistrations = event.teamRegistrations || [];
    event.teamRegistrations.push({
      teamName,
      pocName,
      pocEmail,
      members,
      totalFee: totalFee || (members.length * event.registrationFee),
      registeredAt: new Date()
    });

    // ===== SYNC ALL TEAM MEMBERS =====
    // Look up ALL team member emails to find registered users
    if (!event.participants) event.participants = [];
    const allMemberEmails = members.map(m => m.email.toLowerCase());
    
    // Also include the registering user
    const registeringUser = await User.findById(req.user.id);
    if (registeringUser && !allMemberEmails.includes(registeringUser.email.toLowerCase())) {
      allMemberEmails.push(registeringUser.email.toLowerCase());
    }
    
    // Find all users whose emails match any team member email
    const matchedUsers = await User.find({ email: { $in: allMemberEmails } });
    console.log(`👥 Found ${matchedUsers.length} registered users out of ${allMemberEmails.length} team member emails`);

    // Add ALL matched users to event.participants + store ticket in their profile
    for (const memberUser of matchedUsers) {
      // Add to event.participants if not already there
      const alreadyParticipant = event.participants.some(
        id => id.toString() === memberUser._id.toString()
      );
      if (!alreadyParticipant) {
        event.participants.push(memberUser._id);
        console.log(`✅ Added ${memberUser.email} to event.participants`);
      }

      // Store ticket record in member's profile
      memberUser.eventTickets = memberUser.eventTickets || [];
      const alreadyHasTicket = memberUser.eventTickets.some(
        t => t.eventId && t.eventId.toString() === event._id.toString()
      );
      if (!alreadyHasTicket) {
        memberUser.eventTickets.push({
          eventId: event._id,
          ticketId: teamTicketId,
          registeredAt: new Date(),
          emailSent: false
        });
        await memberUser.save();
        console.log(`✅ Stored ticket in profile for ${memberUser.email}`);
      }
    }

    // Also ensure the registering user (form submitter) is added even if their email wasn't in the members list
    const submitterAlreadyAdded = event.participants.some(
      id => id.toString() === req.user.id.toString()
    );
    if (!submitterAlreadyAdded) {
      event.participants.push(req.user.id);
    }
    if (registeringUser) {
      const submitterHasTicket = (registeringUser.eventTickets || []).some(
        t => t.eventId && t.eventId.toString() === event._id.toString()
      );
      if (!submitterHasTicket) {
        registeringUser.eventTickets = registeringUser.eventTickets || [];
        registeringUser.eventTickets.push({
          eventId: event._id,
          ticketId: teamTicketId,
          registeredAt: new Date(),
          emailSent: false
        });
        await registeringUser.save();
      }
    }

    // Save event with all participants added
    await event.save();
    console.log(`💾 Event saved. Total participants: ${event.participants.length}`);

    // ===== SEND EMAILS TO ALL MEMBERS =====
    let emailResult = { success: false };
    try {
      const teamDataForEmail = {
        teamName,
        pocName,
        pocEmail,
        members,
        totalFee: totalFee || (members.length * event.registrationFee)
      };

      const eventDataForEmail = {
        name: event.name,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        organizerName: event.organizer?.organizerName || 'Organizer',
        registrationFee: event.registrationFee,
        eligibility: event.eligibility
      };

      console.log('📧 Sending team tickets to all members...');
      emailResult = await sendTeamEventTickets(teamDataForEmail, eventDataForEmail);
      console.log('📧 Team email result:', emailResult);

      // Update emailSent flag for all matched users whose email was sent
      if (emailResult.results && emailResult.results.length > 0) {
        for (const result of emailResult.results) {
          if (result.success) {
            try {
              const sentUser = await User.findOne({ email: result.email.toLowerCase() });
              if (sentUser && sentUser.eventTickets?.length > 0) {
                const ticket = sentUser.eventTickets.find(
                  t => t.eventId && t.eventId.toString() === event._id.toString()
                );
                if (ticket) {
                  ticket.emailSent = true;
                  ticket.ticketId = emailResult.ticketId || teamTicketId;
                  await sentUser.save();
                }
              }
            } catch (updateErr) {
              console.error(`❌ Error updating email status for ${result.email}:`, updateErr);
            }
          }
        }
      }
    } catch (emailErr) {
      console.error('❌ Error sending team emails:', emailErr);
    }

    const emailNote = emailResult.success 
      ? ` 📧 Tickets sent to all ${emailResult.sentCount} team members!`
      : emailResult.partial 
        ? ` ⚠️ Tickets sent to ${emailResult.sentCount}/${emailResult.totalMembers} members.`
        : (emailResult.error ? ' ⚠️ Registration successful but emails could not be sent.' : '');

    res.status(200).json({
      message: "Team registered successfully!" + emailNote,
      teamName,
      totalFee: totalFee || (members.length * event.registrationFee),
      ticket: {
        ticketId: emailResult.ticketId || teamTicketId,
        emailsSent: emailResult.sentCount || 0,
        totalMembers: members.length
      }
    });

  } catch (error) {
    console.error("Team registration error:", error);
    res.status(500).json({ message: "Error registering team" });
  }
});

// Organizer: Upload image to scan QR (accepts image file and returns decoded payload)
router.post('/scan-qr', protect, authorize('Organizer'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const buffer = req.file.buffer;
    const image = await Jimp.read(buffer);
    
    // jsQR expects raw RGBA pixel data
    const { width, height } = image.bitmap;
    const imageData = new Uint8ClampedArray(image.bitmap.data);
    
    const code = jsQR(imageData, width, height);

    if (!code || !code.data) {
      return res.status(400).json({ message: 'No QR code found in image' });
    }
    
    let payload;
    try { payload = JSON.parse(code.data); } catch (e) { payload = code.data; }
    res.json({ success: true, payload });
  } catch (err) {
    console.error('QR scan error:', err);
    res.status(500).json({ message: 'Error scanning QR' });
  }
});

// Verify a ticket for a specific event (after QR scan)
router.post('/verify-ticket/:eventId', protect, authorize('Organizer'), async (req, res) => {
  try {
    const { ticketId } = req.body;
    const { eventId } = req.params;

    if (!ticketId) {
      return res.status(400).json({ message: 'Ticket ID is required' });
    }

    // Find the event
    const event = await Event.findById(eventId).populate('organizer', 'organizerName');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Verify organizer owns this event
    if (event.organizer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to verify tickets for this event' });
    }

    // Find the user with this ticket
    const user = await User.findOne({
      'eventTickets.ticketId': ticketId,
      'eventTickets.eventId': eventId
    }).select('firstName lastName email contactNumber participantType collegeName eventTickets');

    if (!user) {
      return res.status(404).json({ 
        verified: false, 
        message: '❌ Invalid ticket! No matching registration found for this event.' 
      });
    }

    // Check if the user is actually in the event's participants list
    const isParticipant = event.participants.some(p => p.toString() === user._id.toString());
    if (!isParticipant) {
      return res.status(400).json({
        verified: false,
        message: '❌ This user is not registered for this event.'
      });
    }

    // Get the specific ticket record
    const ticketRecord = user.eventTickets.find(
      t => t.ticketId === ticketId && t.eventId.toString() === eventId
    );

    res.json({
      verified: true,
      message: '✅ Ticket verified successfully!',
      participant: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        contact: user.contactNumber || 'N/A',
        type: user.participantType || 'N/A',
        college: user.collegeName || 'N/A',
        registeredAt: ticketRecord?.registeredAt
      },
      event: {
        name: event.name,
        type: event.type,
        venue: event.venue
      }
    });

  } catch (err) {
    console.error('Ticket verification error:', err);
    res.status(500).json({ message: 'Error verifying ticket' });
  }
});

// Get Form Responses for an event (organizer only)
router.get('/:id/form-responses', protect, authorize('Organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('name customFields formResponses formLocked organizer');
    
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      eventName: event.name,
      customFields: event.customFields || [],
      formLocked: event.formLocked || false,
      responses: event.formResponses || [],
      totalResponses: (event.formResponses || []).length
    });
  } catch (err) {
    console.error('Error fetching form responses:', err);
    res.status(500).json({ message: 'Error fetching form responses' });
  }
});

// Update Event (for organizers to edit their events)
// Editing Rules:
//   Draft      → free edits on all fields, can be published
//   Published  → description update, extend deadline, increase limit, close registrations (status change)
//   Ongoing    → only status change (to Completed or Closed)
//   Closed/Completed → no edits
router.put('/:id', protect, authorize('Organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if the organizer owns this event
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this event" });
    }

    const currentStatus = event.status || 'Draft';
    const updates = req.body;

    // ---- Editing rules based on status ----

    if (currentStatus === 'Closed' || currentStatus === 'Completed') {
      return res.status(400).json({ message: "Cannot edit a Closed or Completed event." });
    }

    if (currentStatus === 'Ongoing') {
      // Only allow status change (to Completed or Closed)
      const allowedKeys = ['status'];
      const attemptedKeys = Object.keys(updates);
      const disallowed = attemptedKeys.filter(k => !allowedKeys.includes(k));
      if (disallowed.length > 0) {
        return res.status(400).json({
          message: `Ongoing events can only have their status changed. Cannot edit: ${disallowed.join(', ')}`
        });
      }
      if (updates.status && !['Completed', 'Closed'].includes(updates.status)) {
        return res.status(400).json({ message: "Ongoing events can only be marked as Completed or Closed." });
      }
    }

    if (currentStatus === 'Published') {
      // Allowed: description, registrationDeadline (extend only), registrationLimit (increase only), status
      const allowedKeys = ['description', 'registrationDeadline', 'registrationLimit', 'status'];
      const attemptedKeys = Object.keys(updates);
      const disallowed = attemptedKeys.filter(k => !allowedKeys.includes(k));
      if (disallowed.length > 0) {
        return res.status(400).json({
          message: `Published events only allow editing: description, registration deadline, registration limit, and status. Cannot edit: ${disallowed.join(', ')}`
        });
      }

      // Deadline can only be extended (new deadline must be >= current deadline)
      if (updates.registrationDeadline) {
        const newDeadline = new Date(updates.registrationDeadline);
        const currentDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
        if (currentDeadline && newDeadline < currentDeadline) {
          return res.status(400).json({
            message: "Registration deadline can only be extended, not shortened."
          });
        }
      }

      // Limit can only be increased
      if (updates.registrationLimit !== undefined) {
        const newLimit = parseInt(updates.registrationLimit);
        const currentLimit = event.registrationLimit || 0;
        if (newLimit < currentLimit) {
          return res.status(400).json({
            message: `Registration limit can only be increased. Current limit: ${currentLimit}`
          });
        }
      }

      // Status changes for published: can go to Ongoing or Closed
      if (updates.status && !['Ongoing', 'Closed'].includes(updates.status)) {
        return res.status(400).json({
          message: "Published events can only be changed to Ongoing or Closed."
        });
      }
    }

    // Draft → free edits, no restrictions
    // BUT: if form is locked (first registration received), customFields cannot be changed
    if (event.formLocked && updates.customFields) {
      return res.status(400).json({
        message: "Registration form is locked! Custom fields cannot be modified after the first registration is received."
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('organizer', 'organizerName email discordWebhook');

    // If status changed from Draft to Published, send Discord webhook
    if (currentStatus === 'Draft' && updates.status === 'Published') {
      const organizer = updatedEvent.organizer;
      if (organizer.discordWebhook) {
        try {
          console.log('📢 Posting event to Discord...');
          const discordResult = await sendEventToDiscord(
            organizer.discordWebhook, 
            updatedEvent, 
            organizer.organizerName
          );
          if (discordResult.success) {
            console.log('✅ Discord webhook sent successfully');
          } else {
            console.log('⚠️ Discord webhook failed:', discordResult.error);
          }
        } catch (discordErr) {
          console.error('❌ Discord webhook error:', discordErr);
          // Don't fail the update if Discord fails
        }
      }
    }

    res.json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Error updating event" });
  }
});

module.exports = router;