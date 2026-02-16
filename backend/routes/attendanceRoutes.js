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
