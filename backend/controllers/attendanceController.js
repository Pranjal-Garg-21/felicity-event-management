const User = require('../models/User');
const Event = require('../models/Event');
const QRCode = require('qrcode');

// @desc    Scan QR code and mark attendance
// @route   POST /api/attendance/scan
// @access  Private (Organizer)
exports.scanAttendance = async (req, res) => {
  try {
    const { ticketId, eventId, scanMethod, manualOverride, overrideReason } = req.body;

    console.log(`📡 Scan Request: TicketID='${ticketId}', EventID='${eventId}'`);

    if (!ticketId || !eventId) {
      return res.status(400).json({ message: 'Ticket ID and Event ID are required' });
    }

    // Find the event and verify organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the organizer of this event
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to scan for this event' });
    }

    // Find the user with this ticket
    // Case-insensitive search for ticketId just in case
    const user = await User.findOne({
      'eventTickets.ticketId': { $regex: new RegExp(`^${ticketId}$`, 'i') }
    });

    if (!user) {
      console.log(`❌ User NOT found for ticket: '${ticketId}'`);
      return res.status(404).json({ message: 'Invalid ticket - User not found' });
    }
    console.log(`✅ User found: ${user.email} (${user._id})`);

    // Find the specific ticket
    const ticket = user.eventTickets.find(t => t.ticketId.toLowerCase() === ticketId.toLowerCase());
    if (!ticket) {
      console.log(`❌ Ticket object missing in user array for: '${ticketId}'`);
      return res.status(404).json({ message: 'Ticket not found' });
    }
    console.log(`🎫 Ticket found in user record. EventID in ticket: ${ticket.eventId}`);

    // Verify ticket is for this event
    if (ticket.eventId.toString() !== eventId) {
      console.log(`❌ Ticket EventID mismatch! Ticket: ${ticket.eventId}, Scan: ${eventId}`);
      return res.status(400).json({ message: 'This ticket is not valid for this event' });
    }

    // Check if already scanned (duplicate scan)
    if (ticket.scanned && !manualOverride) {
      return res.status(400).json({
        message: 'Ticket already scanned',
        alreadyScanned: true,
        scannedAt: ticket.scannedAt,
        participant: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          rollNumber: user.rollNumber
        }
      });
    }

    // Mark attendance
    console.log('📝 Before update - ticket.scanned:', ticket.scanned);
    ticket.scanned = true;
    ticket.scannedAt = new Date();
    ticket.scannedBy = req.user._id;
    console.log('📝 After update - ticket.scanned:', ticket.scanned);
    await user.save();
    console.log('💾 User saved successfully');

    // Verify the save worked by re-fetching
    const verifyUser = await User.findById(user._id);
    const verifyTicket = verifyUser.eventTickets.find(t => t.ticketId === ticketId);
    console.log('✅ Verification - ticket.scanned after save:', verifyTicket.scanned);
    console.log('✅ Verification - ticket.scannedAt after save:', verifyTicket.scannedAt);

    // Add to event's attendance log
    const attendanceEntry = {
      participantId: user._id,
      participantName: `${user.firstName} ${user.lastName}`,
      participantEmail: user.email,
      ticketId: ticketId,
      scannedAt: new Date(),
      scannedBy: req.user._id,
      scanMethod: scanMethod || 'Camera',
      isManualOverride: manualOverride || false,
      overrideReason: overrideReason || ''
    };

    if (!event.attendanceLog) {
      event.attendanceLog = [];
    }
    event.attendanceLog.push(attendanceEntry);
    await event.save();

    console.log(`✅ Attendance marked: ${user.firstName} ${user.lastName} (${ticketId})`);
    console.log(`Total attendance for event ${eventId}: ${event.attendanceLog.length}`);

    res.status(200).json({
      success: true,
      message: `Attendance marked for ${user.firstName} ${user.lastName}`,
      participant: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        rollNumber: user.rollNumber,
        branch: user.branch,
        year: user.year
      },
      scannedAt: ticket.scannedAt,
      totalAttendance: event.attendanceLog.length
    });

  } catch (error) {
    console.error('Scan attendance error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('User:', req.user);
    res.status(500).json({
      message: 'Server error during attendance scan',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get attendance dashboard for an event
// @route   GET /api/attendance/event/:eventId
// @access  Private (Organizer)
exports.getEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('participants', 'firstName lastName email rollNumber branch year')
      .populate('attendanceLog.participantId', 'firstName lastName email rollNumber');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view attendance for this event' });
    }

    // Get all participants
    const allParticipants = event.participants;

    console.log('📊 Total participants:', allParticipants.length);
    console.log('📋 Attendance log entries:', event.attendanceLog?.length || 0);

    if (event.attendanceLog && event.attendanceLog.length > 0) {
      console.log('🔍 First attendance log entry:', {
        participantId: event.attendanceLog[0].participantId,
        participantIdType: typeof event.attendanceLog[0].participantId,
        participantIdString: event.attendanceLog[0].participantId?.toString(),
        scannedAt: event.attendanceLog[0].scannedAt
      });
    }

    // Create a map of scanned participants from attendanceLog for O(1) lookup
    const scannedMap = new Map();
    (event.attendanceLog || []).forEach(log => {
      // Handle both populated and non-populated participantId
      const participantIdStr = log.participantId?._id
        ? log.participantId._id.toString()
        : log.participantId?.toString();

      if (participantIdStr) {
        scannedMap.set(participantIdStr, log.scannedAt);
        console.log('✅ Added to scannedMap:', participantIdStr);
      }
    });

    console.log('🗺️ ScannedMap size:', scannedMap.size);

    // Separate scanned and not scanned
    const scannedParticipants = [];
    const notScannedParticipants = [];

    for (const participant of allParticipants) {
      const participantId = participant._id.toString();
      const scannedAt = scannedMap.get(participantId);

      console.log(`👤 Checking participant ${participant.firstName}: ID=${participantId}, scannedAt=${scannedAt}`);

      const participantData = {
        _id: participant._id,
        name: `${participant.firstName} ${participant.lastName}`,
        email: participant.email,
        rollNumber: participant.rollNumber,
        branch: participant.branch,
        year: participant.year,
        scannedAt: scannedAt || null
      };

      if (scannedAt) {
        scannedParticipants.push(participantData);
        console.log(`  ✅ Added to scannedParticipants`);
      } else {
        notScannedParticipants.push(participantData);
        console.log(`  ⏳ Added to notScannedParticipants`);
      }
    }

    console.log('Attendance calculation:', {
      totalParticipants: allParticipants.length,
      scannedCount: scannedParticipants.length,
      notScannedCount: notScannedParticipants.length,
      attendanceLogLength: event.attendanceLog?.length || 0
    });

    res.status(200).json({
      event: {
        _id: event._id,
        name: event.name,
        date: event.date,
        time: event.time,
        venue: event.venue
      },
      totalRegistered: allParticipants.length,
      totalScanned: scannedParticipants.length,
      totalNotScanned: notScannedParticipants.length,
      attendancePercentage: allParticipants.length > 0
        ? ((scannedParticipants.length / allParticipants.length) * 100).toFixed(2)
        : 0,
      scannedParticipants: scannedParticipants.sort((a, b) =>
        new Date(b.scannedAt) - new Date(a.scannedAt)
      ),
      notScannedParticipants: notScannedParticipants.sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      attendanceLog: event.attendanceLog || []
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error fetching attendance' });
  }
};

// @desc    Scan QR code from uploaded file
// @route   POST /api/attendance/scan-file
// @access  Private (Organizer)
exports.scanFile = async (req, res) => {
  try {
    const { qrData, eventId } = req.body;

    if (!qrData || !eventId) {
      return res.status(400).json({ message: 'QR data and Event ID are required' });
    }

    // Parse QR data (it should be JSON with ticketId, eventId, email)
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }

    const { ticketId } = parsedData;

    if (!ticketId) {
      return res.status(400).json({ message: 'QR code does not contain ticket information' });
    }

    // Use the existing scanAttendance logic
    req.body = {
      ticketId,
      eventId,
      scanMethod: 'File Upload'
    };

    // Call scanAttendance
    return exports.scanAttendance(req, res);

  } catch (error) {
    console.error('Scan file error:', error);
    res.status(500).json({
      message: 'Server error scanning file',
      error: error.message
    });
  }
};

// @desc    Export attendance as CSV
// @route   GET /api/attendance/export/:eventId
// @access  Private (Organizer)
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('participants', 'firstName lastName email rollNumber branch year');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to export attendance for this event' });
    }

    // Create CSV header
    let csv = 'Name,Email,Roll Number,Branch,Year,Status,Scanned At\n';

    // Get scanned status for each participant
    for (const participant of event.participants) {
      const fullUser = await User.findById(participant._id);
      const ticket = fullUser.eventTickets.find(
        t => t.eventId.toString() === eventId
      );

      const status = ticket?.scanned ? 'Present' : 'Absent';
      const scannedAt = ticket?.scannedAt
        ? new Date(ticket.scannedAt).toLocaleString()
        : 'N/A';

      csv += `"${participant.firstName} ${participant.lastName}",`;
      csv += `"${participant.email}",`;
      csv += `"${participant.rollNumber || 'N/A'}",`;
      csv += `"${participant.branch || 'N/A'}",`;
      csv += `"${participant.year || 'N/A'}",`;
      csv += `"${status}",`;
      csv += `"${scannedAt}"\n`;
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${event.name.replace(/\s+/g, '_')}_${Date.now()}.csv"`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Server error exporting attendance' });
  }
};

// @desc    Manual attendance override
// @route   POST /api/attendance/manual
// @access  Private (Organizer)
exports.manualAttendance = async (req, res) => {
  try {
    const { userId, eventId, action, reason } = req.body;

    if (!userId || !eventId || !action) {
      return res.status(400).json({ message: 'User ID, Event ID, and action are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the ticket
    const ticket = user.eventTickets.find(t => t.eventId.toString() === eventId);
    if (!ticket) {
      return res.status(404).json({ message: 'User is not registered for this event' });
    }

    if (action === 'mark') {
      // Mark as present
      ticket.scanned = true;
      ticket.scannedAt = new Date();
      await user.save();

      // Add to attendance log
      if (!event.attendanceLog) {
        event.attendanceLog = [];
      }
      event.attendanceLog.push({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        ticketId: ticket.ticketId,
        scannedAt: new Date(),
        scannedBy: req.user._id,
        scannerName: `${req.user.firstName} ${req.user.lastName}`,
        manualOverride: true,
        overrideReason: reason || 'Manual attendance marking'
      });
      await event.save();

      res.status(200).json({
        success: true,
        message: `Manually marked ${user.firstName} ${user.lastName} as present`
      });

    } else if (action === 'unmark') {
      // Unmark as present
      ticket.scanned = false;
      ticket.scannedAt = null;
      await user.save();

      // Remove from attendance log
      if (event.attendanceLog) {
        event.attendanceLog = event.attendanceLog.filter(
          log => log.userId.toString() !== userId
        );
        await event.save();
      }

      res.status(200).json({
        success: true,
        message: `Manually unmarked ${user.firstName} ${user.lastName} from attendance`
      });

    } else {
      res.status(400).json({ message: 'Invalid action. Use "mark" or "unmark"' });
    }

  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ message: 'Server error during manual attendance' });
  }
};
