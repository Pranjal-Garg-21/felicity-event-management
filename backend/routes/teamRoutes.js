const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { sendTeamInvitation, sendTeamEventTickets } = require('../utils/emailService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Multer setup
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create a new team for an event (Team Leader)
router.post('/create/:eventId', protect, authorize('Participant'), upload.any(), async (req, res) => {
  try {
    console.log('📝 Team creation request received');
    console.log('Event ID:', req.params.eventId);
    console.log('Request body:', req.body);
    console.log('User:', req.user.id, req.user.email);

    let { teamName, teamSize, memberEmails } = req.body;

    // Parse fields if they are strings (e.g. from FormData)
    if (typeof teamSize === 'string') teamSize = parseInt(teamSize);
    if (typeof memberEmails === 'string') {
      try {
        memberEmails = JSON.parse(memberEmails);
      } catch (e) {
        // Fallback: split by comma if not valid JSON
        memberEmails = memberEmails.split(',').map(e => e.trim());
      }
    }
    const event = await Event.findById(req.params.eventId);

    if (!event || event.type !== 'Team') {
      console.log('❌ Event not found or not a team event');
      return res.status(404).json({ message: 'Team event not found' });
    }

    console.log('✅ Event found:', event.name);

    // Validate team size
    const minSize = event.teamDetails?.minTeamSize || 2;
    const maxSize = event.teamDetails?.maxTeamSize || 4;

    console.log(`Team size validation: ${teamSize} (min: ${minSize}, max: ${maxSize})`);

    if (teamSize < minSize || teamSize > maxSize) {
      console.log('❌ Invalid team size');
      return res.status(400).json({
        message: `Team size must be between ${minSize} and ${maxSize}`
      });
    }

    // Validate member emails count (leader is auto-included, so we need teamSize - 1 other emails)
    if (memberEmails.length !== teamSize - 1) {
      console.log('❌ Invalid number of member emails');
      return res.status(400).json({
        message: `You need to enter exactly ${teamSize - 1} other member email(s) (you are automatically included as the team leader)`
      });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      console.log('❌ Registration deadline passed');
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // Check if registration limit reached
    const currentTeams = event.teamRegistrations?.length || 0;
    if (currentTeams >= event.registrationLimit) {
      console.log('❌ Registration limit reached');
      return res.status(400).json({ message: 'Registration limit reached' });
    }

    // Check if user is already in a team for this event
    const existingTeam = event.teamRegistrations?.find(team =>
      (team.teamLeaderId && team.teamLeaderId.toString() === req.user.id) ||
      team.members.some(m => m.email && m.email.toLowerCase() === req.user.email.toLowerCase())
    );
    if (existingTeam) {
      console.log('❌ User already in a team');
      return res.status(400).json({ message: 'You are already part of a team for this event' });
    }

    // Generate unique invite code
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    console.log('🔑 Generated invite code:', inviteCode);

    // Get team leader info
    const leader = await User.findById(req.user.id);
    console.log('👤 Team leader:', leader.firstName, leader.lastName);

    // Create members array: leader is auto-accepted first, then invited members
    const leaderMember = {
      userId: leader._id,
      name: `${leader.firstName} ${leader.lastName}`,
      email: leader.email.toLowerCase(),
      status: 'Accepted', // Leader is auto-accepted
      invitedAt: new Date(),
      respondedAt: new Date()
    };

    // Filter out leader's email from invitations to prevent duplicates
    const filteredMemberEmails = memberEmails.filter(email =>
      email.toLowerCase() !== leader.email.toLowerCase()
    );

    const invitedMembers = filteredMemberEmails.map(email => ({
      name: email.split('@')[0], // Will be updated when they accept
      email: email.toLowerCase(),
      status: 'Pending',
      invitedAt: new Date()
    }));

    const members = [leaderMember, ...invitedMembers];

    console.log('👥 Team members:', members.length, '(leader auto-accepted + invited:', invitedMembers.length, ')');

    // Add leader to event participants immediately (auto-accepted)
    event.participants = event.participants || [];
    if (!event.participants.some(p => p.toString() === leader._id.toString())) {
      event.participants.push(leader._id);
      console.log(`✅ Added leader ${leader.email} to event participants`);
    }

    // Clean up invalid team registrations (from old schema or failed attempts)
    event.teamRegistrations = event.teamRegistrations || [];
    event.teamRegistrations = event.teamRegistrations.filter(team =>
      team.teamLeaderId && team.teamLeaderName && team.teamLeaderEmail && team.teamSize
    );
    console.log(`🧹 Cleaned up invalid teams. Valid teams: ${event.teamRegistrations.length}`);

    event.teamRegistrations.push({
      teamName,
      teamLeaderId: leader._id,
      teamLeaderName: `${leader.firstName} ${leader.lastName}`,
      teamLeaderEmail: leader.email,
      inviteCode,
      status: 'Pending',
      teamSize,
      members,
      totalFee: teamSize * (event.registrationFee || 0)
    });

    console.log('💾 Saving event...');
    await event.save();
    console.log('✅ Event saved successfully');

    // Send invitations ONLY to non-leader members (leader is auto-accepted)
    const invitedUsers = await User.find({ email: { $in: memberEmails.map(e => e.toLowerCase()) } });
    console.log(`📧 Found ${invitedUsers.length} invited users to notify (excluding leader)`);

    const newTeam = event.teamRegistrations[event.teamRegistrations.length - 1];

    // Handle Custom Form Responses (if any)
    let customFieldResponses = {};
    if (req.body.formResponses) {
      try {
        customFieldResponses = typeof req.body.formResponses === 'string'
          ? JSON.parse(req.body.formResponses)
          : req.body.formResponses;
      } catch (e) {
        console.error("Error parsing team formResponses:", e);
      }
    }

    // Handle File Uploads for Team Form
    if (req.files && req.files.length > 0) {
      console.log(`📎 Processing ${req.files.length} uploaded files for team...`);
      for (const file of req.files) {
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, file.buffer);

        // Store relative path in responses
        customFieldResponses[file.fieldname] = `/uploads/${fileName}`;
      }
    }

    // Save form responses to the main event.formResponses array
    if (Object.keys(customFieldResponses).length > 0) {
      const responseEntry = {
        participantId: leader._id,
        participantEmail: leader.email,
        participantName: `${leader.firstName} ${leader.lastName} (Team: ${teamName})`,
        submittedAt: new Date(),
        responses: event.customFields ? event.customFields.map(field => ({
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          value: customFieldResponses[field.fieldName] ?? ''
        })) : []
      };
      event.formResponses = event.formResponses || [];
      event.formResponses.push(responseEntry);

      // Save event again to update form responses
      await event.save();
    }

    for (const invitedUser of invitedUsers) {
      invitedUser.teamInvites = invitedUser.teamInvites || [];
      invitedUser.teamInvites.push({
        eventId: event._id,
        teamId: newTeam._id,
        inviteCode,
        teamName,
        teamLeaderName: `${leader.firstName} ${leader.lastName}`,
        teamLeaderEmail: leader.email,
        status: 'Pending',
        invitedAt: new Date()
      });

      // Add notification to dashboard for visibility
      invitedUser.notifications = invitedUser.notifications || [];
      invitedUser.notifications.push({
        type: 'team_invite',
        eventId: event._id,
        eventName: event.name,
        title: `Team Invitation: ${teamName}`,
        content: `${leader.firstName} ${leader.lastName} invited you to join team "${teamName}" for ${event.name}. Click to accept or decline.`,
        read: false,
        createdAt: new Date()
      });

      await invitedUser.save();
      console.log(`✅ Invitation and notification saved for ${invitedUser.email}`);
    }

    // Send email notifications to invited members (NOT the leader)
    console.log('📧 Sending invitation emails to non-leader members...');
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join-team/${inviteCode}`;

    for (const email of memberEmails) {
      // Skip if this is the leader's email (shouldn't happen after fix, but safety check)
      if (email.toLowerCase() === leader.email.toLowerCase()) {
        console.log(`⏭️ Skipping invite email to leader: ${email}`);
        continue;
      }

      const emailResult = await sendTeamInvitation({
        memberEmail: email,
        memberName: email.split('@')[0],
        teamName,
        teamLeaderName: `${leader.firstName} ${leader.lastName}`,
        teamLeaderEmail: leader.email,
        eventName: event.name,
        eventDate: event.startDate,
        eventVenue: event.venue,
        inviteCode,
        inviteLink,
        registrationFee: event.registrationFee
      });

      if (emailResult.success) {
        console.log(`✅ Invitation email sent to ${email}`);
        if (emailResult.previewUrl) {
          console.log(`📧 Preview: ${emailResult.previewUrl}`);
        }
      } else {
        console.log(`⚠️ Failed to send email to ${email}: ${emailResult.error || 'Unknown error'}`);
      }
    }

    console.log('🎉 Team creation successful!');
    res.status(201).json({
      message: 'Team created successfully! Invitations sent to all members.',
      team: event.teamRegistrations[event.teamRegistrations.length - 1],
      inviteCode,
      inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join-team/${inviteCode}`
    });

  } catch (error) {
    console.error('❌ Team creation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Error creating team', error: error.message });
  }
});

// Join team using invite code
router.post('/join/:inviteCode', protect, authorize('Participant'), async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const user = await User.findById(req.user.id);

    // Find the event with this invite code
    const event = await Event.findOne({ 'teamRegistrations.inviteCode': inviteCode });
    if (!event) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    const team = event.teamRegistrations.find(t => t.inviteCode === inviteCode);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if registration deadline has passed
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // Check if user is the team leader (leaders are auto-accepted)
    if (user._id.toString() === team.teamLeaderId.toString()) {
      return res.status(400).json({ message: 'You are the team leader and already part of this team' });
    }

    // Check if user was invited
    const memberIndex = team.members.findIndex(m =>
      m.email.toLowerCase() === user.email.toLowerCase()
    );

    if (memberIndex === -1) {
      return res.status(403).json({ message: 'You were not invited to this team' });
    }

    const member = team.members[memberIndex];
    if (member.status === 'Accepted') {
      return res.status(400).json({ message: 'You have already accepted this invitation' });
    }

    if (member.status === 'Declined') {
      return res.status(400).json({ message: 'You have declined this invitation' });
    }

    // Accept invitation
    team.members[memberIndex].userId = user._id;
    team.members[memberIndex].name = `${user.firstName} ${user.lastName}`;
    team.members[memberIndex].status = 'Accepted';
    team.members[memberIndex].respondedAt = new Date();

    // Add user to event participants immediately (so event shows in "My Events")
    event.participants = event.participants || [];
    if (!event.participants.some(p => p.toString() === user._id.toString())) {
      event.participants.push(user._id);
      console.log(`✅ Added ${user.email} to event participants`);
    }

    // Notify team leader that member accepted
    const teamLeader = await User.findById(team.teamLeaderId);
    if (teamLeader) {
      teamLeader.notifications = teamLeader.notifications || [];
      const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1; // +1 for current acceptance
      teamLeader.notifications.push({
        type: 'team_invite',
        eventId: event._id,
        eventName: event.name,
        title: `Team Member Joined: ${team.teamName}`,
        content: `${user.firstName} ${user.lastName} has accepted the invitation to join your team "${team.teamName}". Progress: ${acceptedCount}/${team.teamSize} members.`,
        read: false,
        createdAt: new Date()
      });
      await teamLeader.save();
      console.log(`✅ Notified team leader about ${user.email} acceptance`);
    }

    // Check if team is now complete
    const allAccepted = team.members.every(m => m.status === 'Accepted');
    const acceptedCount = team.members.filter(m => m.status === 'Accepted').length;

    if (allAccepted && acceptedCount === team.teamSize) {
      team.status = 'Complete';
      team.completedAt = new Date();

      // Add all members to event participants
      event.participants = event.participants || [];
      for (const member of team.members) {
        if (member.userId && !event.participants.some(p => p.toString() === member.userId.toString())) {
          event.participants.push(member.userId);
        }
      }

      // Generate UNIQUE ticket ID per member (not a shared team ticket)
      for (const member of team.members) {
        if (member.userId) {
          const memberUser = await User.findById(member.userId);
          if (memberUser) {
            memberUser.eventTickets = memberUser.eventTickets || [];

            // Check if user already has a ticket for this event (prevent duplicates)
            const hasTicket = memberUser.eventTickets.some(t =>
              t.eventId && t.eventId.toString() === event._id.toString()
            );

            if (!hasTicket) {
              // Each member gets their own unique ticket ID
              const memberTicketId = `TICKET-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
              memberUser.eventTickets.push({
                eventId: event._id,
                ticketId: memberTicketId,
                registeredAt: new Date(),
                emailSent: false
              });
              await memberUser.save();
              console.log(`🎫 Generated unique ticket ${memberTicketId} for ${memberUser.email}`);
            } else {
              console.log(`⚠️ ${memberUser.email} already has a ticket for this event`);
            }
          }
        }
      }

      // Send ticket emails to all members (each with their own unique ticket ID)
      console.log('🎫 Sending team event tickets...');
      // Populate organizer data if needed
      await event.populate('organizer');

      const eventData = {
        eventName: event.name,
        name: event.name,
        eventType: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        eventDate: event.startDate,
        eventTime: new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        venue: event.venue || 'TBA',
        organizerName: event.organizer?.organizerName || 'Organizer',
        registrationFee: event.registrationFee,
        eligibility: event.eligibility || 'Open to all'
      };

      // Build teamData with each member's individual ticket ID
      const membersWithTickets = [];
      for (const member of team.members) {
        if (member.userId) {
          const memberUser = await User.findById(member.userId);
          const ticket = memberUser?.eventTickets?.find(t => t.eventId?.toString() === event._id.toString());
          membersWithTickets.push({
            name: member.name,
            email: member.email,
            userId: member.userId,
            ticketId: ticket?.ticketId || 'N/A'
          });
        }
      }

      const teamData = {
        teamName: team.teamName,
        teamLeaderName: team.teamLeaderName,
        teamTicketId: `See individual tickets below`,
        pocName: team.teamLeaderName,
        pocEmail: team.teamLeaderEmail,
        totalFee: event.registrationFee * team.teamSize,
        members: membersWithTickets
      };

      const emailResult = await sendTeamEventTickets(teamData, eventData);

      if (emailResult.success) {
        console.log(`✅ Team tickets sent! Success: ${emailResult.successfulEmails}/${emailResult.totalMembers}`);

        // Update emailSent status and add notification for all members
        for (const member of team.members) {
          if (member.userId) {
            const memberUser = await User.findById(member.userId);
            if (memberUser && memberUser.eventTickets) {
              const ticket = memberUser.eventTickets.find(t => t.eventId?.toString() === event._id.toString());
              if (ticket) {
                ticket.emailSent = true;

                // Add notification about team completion and individual ticket
                memberUser.notifications = memberUser.notifications || [];
                memberUser.notifications.push({
                  type: 'team_invite',
                  eventId: event._id,
                  eventName: event.name,
                  title: `🎉 Team Complete: ${team.teamName}`,
                  content: `Your team "${team.teamName}" for ${event.name} is now complete! Your individual ticket (${ticket.ticketId}) has been generated and sent to your email.`,
                  read: false,
                  createdAt: new Date()
                });

                await memberUser.save();
              }
            }
          }
        }
      } else {
        console.log(`⚠️ Failed to send team tickets: ${emailResult.error}`);
      }
    }

    await event.save();

    // Update user's invite status
    const userInvite = user.teamInvites?.find(inv => inv.inviteCode === inviteCode);
    if (userInvite) {
      userInvite.status = 'Accepted';
      userInvite.respondedAt = new Date();
      await user.save();
    }

    res.json({
      message: team.status === 'Complete'
        ? '✅ Team registration complete! Tickets have been generated for all members.'
        : `✅ You have joined the team! Waiting for ${team.teamSize - acceptedCount} more member(s) to accept.`,
      team,
      isComplete: team.status === 'Complete'
    });

  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ message: 'Error joining team' });
  }
});

// Decline team invitation
router.post('/decline/:inviteCode', protect, authorize('Participant'), async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const user = await User.findById(req.user.id);

    const event = await Event.findOne({ 'teamRegistrations.inviteCode': inviteCode });
    if (!event) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    const team = event.teamRegistrations.find(t => t.inviteCode === inviteCode);
    const memberIndex = team.members.findIndex(m =>
      m.email.toLowerCase() === user.email.toLowerCase()
    );

    if (memberIndex === -1) {
      return res.status(403).json({ message: 'You were not invited to this team' });
    }

    team.members[memberIndex].status = 'Declined';
    team.members[memberIndex].respondedAt = new Date();
    await event.save();

    // Update user's invite status
    const userInvite = user.teamInvites?.find(inv => inv.inviteCode === inviteCode);
    if (userInvite) {
      userInvite.status = 'Declined';
      userInvite.respondedAt = new Date();
      await user.save();
    }

    res.json({ message: 'You have declined the team invitation' });

  } catch (error) {
    console.error('Decline team error:', error);
    res.status(500).json({ message: 'Error declining invitation' });
  }
});

// Get my teams (as leader or member)
router.get('/my-teams', protect, authorize('Participant'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Find events where user is team leader or member
    const events = await Event.find({
      type: 'Team',
      $or: [
        { 'teamRegistrations.teamLeaderId': req.user.id },
        { 'teamRegistrations.members.email': user.email.toLowerCase() }
      ]
    }).populate('organizer', 'organizerName');

    const myTeams = [];
    for (const event of events) {
      for (const team of event.teamRegistrations) {
        const isLeader = team.teamLeaderId.toString() === req.user.id;
        const isMember = team.members.some(m => m.email.toLowerCase() === user.email.toLowerCase());

        if (isLeader || isMember) {
          myTeams.push({
            ...team.toObject(),
            eventId: event._id,
            eventName: event.name,
            eventDate: event.startDate,
            organizerName: event.organizer?.organizerName,
            isLeader
          });
        }
      }
    }

    res.json(myTeams);

  } catch (error) {
    console.error('Get my teams error:', error);
    res.status(500).json({ message: 'Error fetching teams' });
  }
});

// Get pending invitations
router.get('/invitations', protect, authorize('Participant'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('teamInvites.eventId', 'name startDate organizer');

    const pendingInvites = (user.teamInvites || [])
      .filter(inv => inv.status === 'Pending')
      .map(inv => ({
        ...inv.toObject(),
        eventName: inv.eventId?.name,
        eventDate: inv.eventId?.startDate
      }));

    res.json(pendingInvites);

  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ message: 'Error fetching invitations' });
  }
});

// Cancel team (leader only, before completion)
router.delete('/cancel/:teamId', protect, authorize('Participant'), async (req, res) => {
  try {
    const event = await Event.findOne({ 'teamRegistrations._id': req.params.teamId });
    if (!event) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const team = event.teamRegistrations.id(req.params.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is the team leader
    if (team.teamLeaderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only team leader can cancel the team' });
    }

    // Cannot cancel completed teams
    if (team.status === 'Complete') {
      return res.status(400).json({ message: 'Cannot cancel a completed team registration' });
    }

    team.status = 'Cancelled';
    await event.save();

    // Notify all invited members (update their invites)
    const memberEmails = team.members.map(m => m.email.toLowerCase());
    await User.updateMany(
      { email: { $in: memberEmails } },
      { $pull: { teamInvites: { inviteCode: team.inviteCode } } }
    );

    res.json({ message: 'Team cancelled successfully' });

  } catch (error) {
    console.error('Cancel team error:', error);
    res.status(500).json({ message: 'Error cancelling team' });
  }
});

// Get team details by invite code (for preview before joining - no auth required)
// Get team details by invite code (Protected - allows checking if user is already a member)
router.get('/details/:inviteCode', protect, async (req, res) => {
  try {
    const { inviteCode } = req.params;

    // Find the event with this invite code
    const event = await Event.findOne({ 'teamRegistrations.inviteCode': inviteCode })
      .populate('organizer', 'organizerName');

    if (!event) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    const team = event.teamRegistrations.find(t => t.inviteCode === inviteCode);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if team is cancelled
    if (team.status === 'Cancelled') {
      return res.status(400).json({ message: 'This team has been cancelled by the leader' });
    }

    // Check if current user is already a member or leader
    const isLeader = team.teamLeaderId.toString() === req.user.id;
    const isMember = team.members.some(m => m.userId && m.userId.toString() === req.user.id) ||
      team.members.some(m => m.email.toLowerCase() === req.user.email.toLowerCase() && m.status === 'Accepted');

    // Return limited team info (no sensitive data) + membership status
    res.json({
      teamName: team.teamName,
      teamLeaderName: team.teamLeaderName,
      teamSize: team.teamSize,
      status: team.status,
      acceptedCount: team.members.filter(m => m.status === 'Accepted').length,
      isLeader,
      isMember,
      event: {
        name: event.name,
        startDate: event.startDate,
        venue: event.venue,
        registrationFee: event.registrationFee,
        organizerName: event.organizer?.organizerName
      },
      deadline: event.registrationDeadline,
      isExpired: new Date() > new Date(event.registrationDeadline)
    });

  } catch (error) {
    console.error('Get team details error:', error);
    res.status(500).json({ message: 'Error fetching team details' });
  }
});

module.exports = router;
