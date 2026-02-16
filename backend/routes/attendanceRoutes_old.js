const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  scanAttendance,
  getEventAttendance,
  exportAttendanceCSV,
  manualAttendance
} = require('../controllers/attendanceController');

// All routes are protected and require Organizer role
router.post('/scan', protect, authorize('Organizer'), scanAttendance);
router.get('/event/:eventId', protect, authorize('Organizer'), getEventAttendance);
router.get('/export/:eventId', protect, authorize('Organizer'), exportAttendanceCSV);
router.post('/manual', protect, authorize('Organizer'), manualAttendance);

module.exports = router;
    const { ticketId, eventId, scanMethod = 'Camera' } = req.body;

    if (!ticketId || !eventId) {
      return res.status(400).json({ message: 'Ticket ID and Event ID are required' });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to scan tickets for this event' });
    }

    // Find the participant with this ticket
    const participant = await User.findOne({
      'eventTickets.ticketId': ticketId,
      'eventTickets.eventId': eventId
    });

    if (!participant) {
      return res.status(404).json({ message: 'Invalid ticket or participant not registered for this event' });
    }

    // Find the specific ticket
    const ticketIndex = participant.eventTickets.findIndex(
      t => t.ticketId === ticketId && t.eventId.toString() === eventId
    );

    if (ticketIndex === -1) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = participant.eventTickets[ticketIndex];

    // Check if already attended
    if (ticket.attended) {
      return res.status(400).json({
        message: 'Ticket already scanned',
        duplicate: true,
        attendedAt: ticket.attendedAt,
        participantName: `${participant.firstName} ${participant.lastName}`,
        participantEmail: participant.email
      });
    }

    // Mark attendance
    participant.eventTickets[ticketIndex].attended = true;
    participant.eventTickets[ticketIndex].attendedAt = new Date();
    participant.eventTickets[ticketIndex].scannedBy = req.user._id;
    participant.eventTickets[ticketIndex].scanMethod = scanMethod;
    await participant.save();

    // Add to event attendance log
    event.attendanceLog.push({
      participantId: participant._id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      ticketId: ticketId,
      scannedAt: new Date(),
      scannedBy: req.user._id,
      scanMethod: scanMethod,
      isManualOverride: false,
      ipAddress: req.ip
    });
    await event.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      participant: {
        id: participant._id,
        name: `${participant.firstName} ${participant.lastName}`,
        email: participant.email,
        ticketId: ticketId,
        attendedAt: participant.eventTickets[ticketIndex].attendedAt
      }
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ message: 'Server error while scanning ticket', error: error.message });
  }
});

// @route   POST /api/attendance/scan-file
// @desc    Scan QR code from uploaded image file
// @access  Private (Organizer only)
router.post('/scan-file', protect, authorize('Organizer'), upload.single('qrImage'), async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'QR code image is required' });
    }

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Check event ownership
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to scan tickets for this event' });
    }

    // Read and decode QR code from image
    const image = await Jimp.read(req.file.buffer);
    const imageData = {
      data: new Uint8ClampedArray(image.bitmap.data),
      width: image.bitmap.width,
      height: image.bitmap.height
    };

    const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);

    if (!decodedQR) {
      return res.status(400).json({ message: 'No QR code found in the image' });
    }

    // Extract ticket ID from QR code data
    const ticketId = decodedQR.data;

    // Use the same scan logic as the regular scan endpoint
    const participant = await User.findOne({
      'eventTickets.ticketId': ticketId,
      'eventTickets.eventId': eventId
    });

    if (!participant) {
      return res.status(404).json({ message: 'Invalid ticket or participant not registered for this event' });
    }

    const ticketIndex = participant.eventTickets.findIndex(
      t => t.ticketId === ticketId && t.eventId.toString() === eventId
    );

    if (ticketIndex === -1) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = participant.eventTickets[ticketIndex];

    if (ticket.attended) {
      return res.status(400).json({
        message: 'Ticket already scanned',
        duplicate: true,
        attendedAt: ticket.attendedAt,
        participantName: `${participant.firstName} ${participant.lastName}`,
        participantEmail: participant.email
      });
    }

    // Mark attendance
    participant.eventTickets[ticketIndex].attended = true;
    participant.eventTickets[ticketIndex].attendedAt = new Date();
    participant.eventTickets[ticketIndex].scannedBy = req.user._id;
    participant.eventTickets[ticketIndex].scanMethod = 'FileUpload';
    await participant.save();

    // Add to event attendance log
    event.attendanceLog.push({
      participantId: participant._id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      ticketId: ticketId,
      scannedAt: new Date(),
      scannedBy: req.user._id,
      scanMethod: 'FileUpload',
      isManualOverride: false,
      ipAddress: req.ip
    });
    await event.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully via file upload',
      participant: {
        id: participant._id,
        name: `${participant.firstName} ${participant.lastName}`,
        email: participant.email,
        ticketId: ticketId,
        attendedAt: participant.eventTickets[ticketIndex].attendedAt
      }
    });

  } catch (error) {
    console.error('File scan error:', error);
    res.status(500).json({ message: 'Server error while scanning QR code from file', error: error.message });
  }
});

// @route   POST /api/attendance/manual-override
// @desc    Manually mark attendance (exceptional cases)
// @access  Private (Organizer only)
router.post('/manual-override', protect, authorize('Organizer'), async (req, res) => {
  try {
    const { participantEmail, eventId, reason } = req.body;

    if (!participantEmail || !eventId || !reason) {
      return res.status(400).json({ message: 'Participant email, event ID, and reason are required' });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage attendance for this event' });
    }

    // Find the participant
    const participant = await User.findOne({ email: participantEmail });
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Check if participant is registered for this event
    const ticketIndex = participant.eventTickets.findIndex(
      t => t.eventId.toString() === eventId
    );

    if (ticketIndex === -1) {
      return res.status(404).json({ message: 'Participant not registered for this event' });
    }

    const ticket = participant.eventTickets[ticketIndex];

    // Check if already attended
    if (ticket.attended && !ticket.manualOverride) {
      return res.status(400).json({
        message: 'Attendance already marked via scan',
        attendedAt: ticket.attendedAt
      });
    }

    // Mark attendance with manual override
    participant.eventTickets[ticketIndex].attended = true;
    participant.eventTickets[ticketIndex].attendedAt = new Date();
    participant.eventTickets[ticketIndex].scannedBy = req.user._id;
    participant.eventTickets[ticketIndex].scanMethod = 'Manual';
    participant.eventTickets[ticketIndex].manualOverride = true;
    participant.eventTickets[ticketIndex].manualOverrideReason = reason;
    participant.eventTickets[ticketIndex].manualOverrideBy = req.user._id;
    await participant.save();

    // Add to event attendance log
    event.attendanceLog.push({
      participantId: participant._id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      ticketId: ticket.ticketId,
      scannedAt: new Date(),
      scannedBy: req.user._id,
      scanMethod: 'Manual',
      isManualOverride: true,
      overrideReason: reason,
      ipAddress: req.ip
    });
    await event.save();

    res.json({
      success: true,
      message: 'Attendance marked manually',
      participant: {
        id: participant._id,
        name: `${participant.firstName} ${participant.lastName}`,
        email: participant.email,
        attendedAt: participant.eventTickets[ticketIndex].attendedAt,
        manualOverride: true,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Manual override error:', error);
    res.status(500).json({ message: 'Server error while marking manual attendance', error: error.message });
  }
});

// @route   GET /api/attendance/dashboard/:eventId
// @desc    Get live attendance dashboard data
// @access  Private (Organizer only)
router.get('/dashboard/:eventId', protect, authorize('Organizer'), async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId)
      .populate('participants', 'firstName lastName email')
      .populate('attendanceLog.scannedBy', 'firstName lastName');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view attendance for this event' });
    }

    // Get all registered participants with their attendance status
    const participantsWithAttendance = await Promise.all(
      event.participants.map(async (participantId) => {
        const user = await User.findById(participantId);
        const ticket = user.eventTickets.find(t => t.eventId.toString() === eventId);
        
        return {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          ticketId: ticket?.ticketId,
          attended: ticket?.attended || false,
          attendedAt: ticket?.attendedAt,
          scanMethod: ticket?.scanMethod,
          manualOverride: ticket?.manualOverride || false,
          manualOverrideReason: ticket?.manualOverrideReason
        };
      })
    );

    // Separate attended and not attended
    const attended = participantsWithAttendance.filter(p => p.attended);
    const notAttended = participantsWithAttendance.filter(p => !p.attended);

    // Statistics
    const stats = {
      totalRegistered: event.participants.length,
      totalAttended: attended.length,
      totalNotAttended: notAttended.length,
      attendanceRate: event.participants.length > 0 
        ? ((attended.length / event.participants.length) * 100).toFixed(2) 
        : 0,
      manualOverrides: attended.filter(p => p.manualOverride).length,
      lastScanTime: event.attendanceLog.length > 0 
        ? event.attendanceLog[event.attendanceLog.length - 1].scannedAt 
        : null
    };

    res.json({
      event: {
        id: event._id,
        name: event.name,
        status: event.status
      },
      stats,
      attended,
      notAttended,
      recentScans: event.attendanceLog.slice(-10).reverse() // Last 10 scans
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance dashboard', error: error.message });
  }
});

// @route   GET /api/attendance/export/:eventId
// @desc    Export attendance report as CSV
// @access  Private (Organizer only)
router.get('/export/:eventId', protect, authorize('Organizer'), async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId).populate('participants', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to export attendance for this event' });
    }

    // Get all registered participants with their attendance status
    const participantsWithAttendance = await Promise.all(
      event.participants.map(async (participantId) => {
        const user = await User.findById(participantId);
        const ticket = user.eventTickets.find(t => t.eventId.toString() === eventId);
        
        return {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          ticketId: ticket?.ticketId || 'N/A',
          attended: ticket?.attended ? 'Yes' : 'No',
          attendedAt: ticket?.attendedAt ? new Date(ticket.attendedAt).toLocaleString() : 'N/A',
          scanMethod: ticket?.scanMethod || 'N/A',
          manualOverride: ticket?.manualOverride ? 'Yes' : 'No',
          manualOverrideReason: ticket?.manualOverrideReason || 'N/A'
        };
      })
    );

    // Create CSV content
    const csvHeader = 'Name,Email,Ticket ID,Attended,Attended At,Scan Method,Manual Override,Override Reason\n';
    const csvRows = participantsWithAttendance.map(p => 
      `"${p.name}","${p.email}","${p.ticketId}","${p.attended}","${p.attendedAt}","${p.scanMethod}","${p.manualOverride}","${p.manualOverrideReason}"`
    ).join('\n');

    const csv = csvHeader + csvRows;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${event.name.replace(/\s+/g, '-')}-${Date.now()}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error while exporting attendance', error: error.message });
  }
});

// @route   GET /api/attendance/audit-log/:eventId
// @desc    Get complete audit log with all attendance actions
// @access  Private (Organizer only)
router.get('/audit-log/:eventId', protect, authorize('Organizer'), async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('attendanceLog.participantId', 'firstName lastName email')
      .populate('attendanceLog.scannedBy', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view audit log for this event' });
    }

    const auditLog = event.attendanceLog.map(log => ({
      participantName: log.participantName,
      participantEmail: log.participantEmail,
      ticketId: log.ticketId,
      scannedAt: log.scannedAt,
      scannedBy: log.scannedBy ? `${log.scannedBy.firstName} ${log.scannedBy.lastName}` : 'Unknown',
      scanMethod: log.scanMethod,
      isManualOverride: log.isManualOverride,
      overrideReason: log.overrideReason || 'N/A',
      ipAddress: log.ipAddress
    }));

    res.json({
      event: {
        id: event._id,
        name: event.name
      },
      totalScans: auditLog.length,
      auditLog: auditLog.reverse() // Most recent first
    });

  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ message: 'Server error while fetching audit log', error: error.message });
  }
});

module.exports = router;
