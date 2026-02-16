const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { sendTeamInvitation, sendTeamEventTickets } = require('../utils/emailService');

// Create a new team for an event (Team Leader)
router.post('/create/:eventId', protect, authorize('Participant'), async (req, res) => {
  try {
    console.log('📝 Team creation request received');
    console.log('Event ID:', req.params.eventId);
    console.log('Request body:', req.body);
    console.log('User:', req.user.id, req.user.email);
    
    const { teamName, teamSize, memberEmails } = req.body;
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

    // Validate member emails count (should match teamSize exactly)
    if (memberEmails.length !== teamSize) {
      console.log('❌ Invalid number of member emails');
      return res.status(400).json({ 
        message: `You need to enter exactly ${teamSize} member email(s) to match the team size`
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

    // Create members array with ALL invited members (including creator if their email is in the list)
    const members = memberEmails.map(email => ({
      name: email.split('@')[0], // Will be updated when they accept
      email: email.toLowerCase(),
      status: 'Pending',
      invitedAt: new Date()
    }));

    console.log('👥 Team members:', members.length);

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

    // Send invitations to all members
    const invitedUsers = await User.find({ email: { $in: memberEmails.map(e => e.toLowerCase()) } });
    console.log(`📧 Found ${invitedUsers.length} invited users to notify`);
    
    for (const invitedUser of invitedUsers) {
      invitedUser.teamInvites = invitedUser.teamInvites || [];
      invitedUser.teamInvites.push({
        eventId: event._id,
        teamId: event.teamRegistrations[event.teamRegistrations.length - 1]._id,
        inviteCode,
        teamName,
        teamLeaderName: `${leader.firstName} ${leader.lastName}`,
        teamLeaderEmail: leader.email,
        status: 'Pending',
        invitedAt: new Date()
      });
      await invitedUser.save();
      console.log(`✅ Invitation saved for ${invitedUser.email}`);
    }

    // Send email notifications to invited members
    console.log('📧 Sending invitation emails...');
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join-team/${inviteCode}`;
    
    for (const email of memberEmails) {
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

      // Generate tickets for all members
      const teamTicketId = `TEAM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
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
              memberUser.eventTickets.push({
                eventId: event._id,
                ticketId: teamTicketId,
                registeredAt: new Date(),
                emailSent: false
              });
              await memberUser.save();
              console.log(`🎫 Generated ticket for ${memberUser.email}`);
            } else {
              console.log(`⚠️ ${memberUser.email} already has a ticket for this event`);
            }
          }
        }
      }

      // Send ticket emails to all members
      console.log('🎫 Sending team event tickets...');
      const teamData = {
        teamName: team.teamName,
        teamLeaderName: team.teamLeaderName,
        teamTicketId: teamTicketId,
        members: team.members.map(m => ({
          name: m.name,
          email: m.email,
          userId: m.userId
        }))
      };

      const eventData = {
        eventName: event.name,
        eventType: event.type,
        eventDate: event.startDate,
        eventTime: new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        venue: event.venue || 'TBA',
        organizerName: typeof event.organizer === 'object' ? event.organizer.organizerName : 'Organizer',
        registrationFee: event.registrationFee,
        eligibility: event.eligibility || 'Open to all'
      };

      const emailResult = await sendTeamEventTickets(teamData, eventData);
      
      if (emailResult.success) {
        console.log(`✅ Team tickets sent! Success: ${emailResult.successfulEmails}/${emailResult.totalMembers}`);
        
        // Update emailSent status for all members
        for (const member of team.members) {
          if (member.userId) {
            const memberUser = await User.findById(member.userId);
            if (memberUser && memberUser.eventTickets) {
              const ticket = memberUser.eventTickets.find(t => t.ticketId === teamTicketId);
              if (ticket) {
                ticket.emailSent = true;
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

module.exports = router;
