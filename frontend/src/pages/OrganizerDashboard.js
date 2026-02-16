import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DiscussionForum from '../components/DiscussionForum';

const OrganizerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [activeTab, setActiveTab] = useState('published'); // Navigation tabs: published, create, details, analytics, profile
  const [selectedEventDetails, setSelectedEventDetails] = useState(null); // For viewing participants
  const [isEditing, setIsEditing] = useState(false); // Edit mode toggle
  const [editData, setEditData] = useState({}); // Editable fields
  const [statusFilter, setStatusFilter] = useState('All'); // Filter events by status
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // Filter participants by attendance: 'all', 'attended', 'notYet'
  const [attendanceData, setAttendanceData] = useState(null); // Attendance data from attendance API
  
  // Profile editing state
  const [profileData, setProfileData] = useState({
    organizerName: '',
    category: '',
    description: '',
    contactNumber: '',
    contactEmail: '',
    discordWebhook: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { verified, participant, event, message }
  const [scanLoading, setScanLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  
  // Create Event Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Normal',
    eligibility: '',
    registrationDeadline: '',
    registrationLimit: '',
    registrationFee: '',
    venue: '',
    tags: '',
    // Team event specific
    minTeamSize: '',
    maxTeamSize: ''
  });

  // Event Sessions (multiple dates/times)
  const [eventSessions, setEventSessions] = useState([
    { sessionName: '', startDate: '', startTime: '', endDate: '', endTime: '', venue: '' }
  ]);

  // Dynamic Custom Fields that organizer can add
  const [customFields, setCustomFields] = useState([]);

  // Available field types for custom fields
  const fieldTypes = [
    { value: 'Text', label: '📝 Text Input' },
    { value: 'Textarea', label: '📄 Long Text / Textarea' },
    { value: 'Number', label: '🔢 Number' },
    { value: 'Date', label: '📅 Date' },
    { value: 'Email', label: '📧 Email' },
    { value: 'Phone', label: '📞 Phone Number' },
    { value: 'Dropdown', label: '📋 Dropdown Select' },
    { value: 'Checkbox', label: '☑️ Checkbox' },
    { value: 'FileUpload', label: '📎 File Upload' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const [eventRes, profileRes] = await Promise.all([
          axios.get('http://localhost:5000/api/events/my-events', config),
          axios.get('http://localhost:5000/api/users/profile', config)
        ]);
        setMyEvents(eventRes.data);
        console.log('Profile data:', profileRes.data);
        console.log('Followers:', profileRes.data.followers);
        setFollowers(profileRes.data.followers || []);
        
        // Populate profile data for editing
        setProfileData({
          organizerName: profileRes.data.organizerName || '',
          category: profileRes.data.category || '',
          description: profileRes.data.description || '',
          contactNumber: profileRes.data.contactNumber || '',
          contactEmail: profileRes.data.contactEmail || '',
          discordWebhook: profileRes.data.discordWebhook || ''
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (err.response) {
          console.error("Response data:", err.response.data);
        }
      }
    };
    if (user?.token) fetchData();
    
    // Auto-refresh every 30 seconds to keep participant counts in sync
    const interval = setInterval(() => {
      if (user?.token) fetchData();
    }, 30000);
    
    // Auto-refresh when page becomes visible (e.g., when navigating back from QR Scanner)
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.token) {
        console.log('👁️ Page became visible, refreshing data...');
        fetchData();
        // Also refresh selected event details if viewing an event
        if (selectedEventDetails?._id) {
          console.log('🔄 Refreshing selected event details...');
          fetchEventDetails(selectedEventDetails._id);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch event details with participants
  const fetchEventDetails = async (eventId) => {
    try {
      console.log('🔄 Fetching event details for eventId:', eventId);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`http://localhost:5000/api/events/${eventId}`, config);
      
      console.log('📊 Event data received:', data.name);
      console.log('👥 Participants count:', data.participants?.length);
      console.log('🎫 Participants with eventTickets:', data.participants?.filter(p => p.eventTickets?.length > 0).length);
      
      // Log first participant's ticket info for debugging
      if (data.participants && data.participants.length > 0) {
        const firstParticipant = data.participants[0];
        console.log('🔍 First participant:', firstParticipant.firstName, firstParticipant.lastName);
        console.log('🎫 Their tickets:', firstParticipant.eventTickets);
        
        // Check for scanned tickets
        const scannedTickets = firstParticipant.eventTickets?.filter(t => 
          t.eventId?.toString() === eventId && t.scanned
        );
        console.log('✅ Scanned tickets for this event:', scannedTickets);
      }
      
      setSelectedEventDetails(data);
      setActiveTab('details');
      
      // Fetch attendance data from attendance API
      await fetchAttendanceData(eventId);
      
      // Also refresh the main event list to keep participant counts in sync
      const eventRes = await axios.get('http://localhost:5000/api/events/my-events', config);
      setMyEvents(eventRes.data);
    } catch (err) {
      console.error("Error fetching event details:", err);
      alert("Could not fetch event details");
    }
  };

  // Fetch attendance data from attendance API
  const fetchAttendanceData = async (eventId) => {
    try {
      console.log('📊 Fetching attendance data from attendance API for:', eventId);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`http://localhost:5000/api/attendance/event/${eventId}`, config);
      
      console.log('✅ Attendance data received:', {
        totalScanned: data.totalScanned,
        totalNotScanned: data.totalNotScanned,
        scannedCount: data.scannedParticipants?.length,
        notScannedCount: data.notScannedParticipants?.length
      });
      
      setAttendanceData(data);
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      setAttendanceData(null);
    }
  };

  // Export Attendance as CSV
  const exportAttendanceCSV = () => {
    if (!selectedEventDetails || !selectedEventDetails.participants || selectedEventDetails.participants.length === 0) {
      alert('No participants to export');
      return;
    }

    console.log('📊 Exporting CSV with attendance data:', attendanceData ? 'Using API data' : 'Using eventTickets fallback');

    // Prepare CSV data
    const headers = ['#', 'Name', 'Email', 'Contact', 'College', 'Attendance Status', 'Scanned At'];
    const rows = selectedEventDetails.participants.map((p, index) => {
      let hasScanned = false;
      let scannedAt = 'N/A';
      
      if (attendanceData) {
        // Use attendance API data
        const scannedParticipant = attendanceData.scannedParticipants?.find(sp => sp.email === p.email);
        hasScanned = !!scannedParticipant;
        scannedAt = scannedParticipant?.scannedAt ? new Date(scannedParticipant.scannedAt).toLocaleString() : 'N/A';
      } else {
        // Fallback to eventTickets
        const ticket = p.eventTickets?.find(t => t.eventId?.toString() === selectedEventDetails._id);
        hasScanned = ticket?.scanned;
        scannedAt = ticket?.scannedAt ? new Date(ticket.scannedAt).toLocaleString() : 'N/A';
      }
      
      return [
        index + 1,
        `${p.firstName} ${p.lastName}`,
        p.email,
        p.contactNumber || 'N/A',
        p.college || 'N/A',
        hasScanned ? 'Attended' : 'Not Yet Arrived',
        hasScanned ? scannedAt : 'N/A'
      ];
    });

    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEventDetails.name}_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ CSV exported successfully');
  };

  // Event Session Management
  const addSession = () => {
    setEventSessions([...eventSessions, { sessionName: '', startDate: '', startTime: '', endDate: '', endTime: '', venue: '' }]);
  };

  const removeSession = (index) => {
    if (eventSessions.length > 1) {
      setEventSessions(eventSessions.filter((_, i) => i !== index));
    }
  };

  const updateSession = (index, field, value) => {
    const newSessions = [...eventSessions];
    newSessions[index][field] = value;
    setEventSessions(newSessions);
  };

  // Custom Fields Management
  const addCustomField = () => {
    setCustomFields([...customFields, { 
      fieldName: '', 
      fieldType: 'Text', 
      isRequired: false, 
      placeholder: '',
      options: [], // For dropdown/checkbox
      order: customFields.length // Auto-assign order
    }]);
  };

  const removeCustomField = (index) => {
    const newFields = customFields.filter((_, i) => i !== index);
    // Re-index order after removal
    setCustomFields(newFields.map((f, i) => ({ ...f, order: i })));
  };

  const updateCustomField = (index, field, value) => {
    const newFields = [...customFields];
    newFields[index][field] = value;
    setCustomFields(newFields);
  };

  const updateCustomFieldOptions = (index, optionsString) => {
    const newFields = [...customFields];
    newFields[index].options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
    setCustomFields(newFields);
  };

  // Reorder custom fields (move up/down)
  const moveCustomField = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= customFields.length) return;
    const newFields = [...customFields];
    const temp = newFields[index];
    newFields[index] = newFields[newIndex];
    newFields[newIndex] = temp;
    // Update order values
    setCustomFields(newFields.map((f, i) => ({ ...f, order: i })));
  };

  // Handle Publishing a Draft Event
  const handlePublishDraft = async (eventId) => {
    const event = selectedEventDetails;
    
    // Validate that all required fields are filled for publishing
    if (!event.eligibility || !event.registrationDeadline || !event.registrationLimit || !event.venue) {
      alert('❌ Cannot publish incomplete event!\n\nPlease ensure the following fields are filled:\n- Eligibility\n- Registration Deadline\n- Registration Limit\n- Venue\n\nEdit the event to add these details.');
      return;
    }

    if (!event.eventSessions || event.eventSessions.length === 0 || !event.eventSessions[0].startDate) {
      alert('❌ Cannot publish event without sessions!\n\nPlease add at least one event session with dates.');
      return;
    }

    if (event.type === 'Team' && (!event.teamDetails?.minTeamSize || !event.teamDetails?.maxTeamSize)) {
      alert('❌ Team events require minimum and maximum team size!');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to publish "${event.name}"?\n\nOnce published, the event will be visible to all participants.`);
    if (!confirmed) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      // Update event status to Published
      await axios.put(`http://localhost:5000/api/events/${eventId}`, 
        { status: 'Published' }, 
        config
      );
      
      alert('🎉 Event Published Successfully!');
      
      // Refresh events list
      const eventRes = await axios.get('http://localhost:5000/api/events/my-events', config);
      setMyEvents(eventRes.data);
      
      // Refresh the current event details
      await fetchEventDetails(eventId);
      
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error publishing event. Please try again.");
    }
  };

  // Start editing - populate edit form with current values
  const startEditing = () => {
    const event = selectedEventDetails;
    setEditData({
      name: event.name || '',
      description: event.description || '',
      type: event.type || 'Normal',
      eligibility: event.eligibility || '',
      registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
      registrationLimit: event.registrationLimit || '',
      registrationFee: event.registrationFee || '',
      venue: event.venue || '',
      tags: event.tags?.join(', ') || '',
      status: event.status || 'Draft'
    });
    setIsEditing(true);
  };

  // Save edits to backend
  const handleSaveEdit = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const event = selectedEventDetails;
      const currentStatus = event.status || 'Draft';

      let updates = {};

      if (currentStatus === 'Draft') {
        // Draft: free edits - send all changed fields
        updates = {};
        if (editData.name !== event.name) updates.name = editData.name;
        if (editData.description !== event.description) updates.description = editData.description;
        if (editData.eligibility !== event.eligibility) updates.eligibility = editData.eligibility;
        if (editData.venue !== event.venue) updates.venue = editData.venue;
        if (editData.registrationFee !== event.registrationFee) updates.registrationFee = editData.registrationFee;
        if (editData.registrationLimit !== event.registrationLimit) updates.registrationLimit = editData.registrationLimit;
        if (editData.registrationDeadline) {
          const newDL = new Date(editData.registrationDeadline).toISOString();
          const oldDL = event.registrationDeadline ? new Date(event.registrationDeadline).toISOString() : '';
          if (newDL !== oldDL) updates.registrationDeadline = editData.registrationDeadline;
        }
        if (editData.tags) {
          const newTags = editData.tags.split(',').map(t => t.trim()).filter(Boolean);
          updates.tags = newTags;
        }
      } else if (currentStatus === 'Published') {
        // Published: only description, extend deadline, increase limit, status
        if (editData.description !== event.description) updates.description = editData.description;
        if (editData.registrationDeadline) {
          const newDL = new Date(editData.registrationDeadline).toISOString();
          const oldDL = event.registrationDeadline ? new Date(event.registrationDeadline).toISOString() : '';
          if (newDL !== oldDL) updates.registrationDeadline = editData.registrationDeadline;
        }
        if (editData.registrationLimit !== event.registrationLimit) {
          updates.registrationLimit = parseInt(editData.registrationLimit);
        }
        if (editData.status && editData.status !== currentStatus) {
          updates.status = editData.status;
        }
      } else if (currentStatus === 'Ongoing') {
        // Ongoing: only status change
        if (editData.status && editData.status !== currentStatus) {
          updates.status = editData.status;
        }
      }

      if (Object.keys(updates).length === 0) {
        alert('No changes detected.');
        setIsEditing(false);
        return;
      }

      const { data } = await axios.put(
        `http://localhost:5000/api/events/${event._id}`,
        updates,
        config
      );

      alert('✅ ' + data.message);
      setIsEditing(false);

      // Refresh event details and list
      await fetchEventDetails(event._id);
      const eventRes = await axios.get('http://localhost:5000/api/events/my-events', config);
      setMyEvents(eventRes.data);

    } catch (err) {
      console.error('Edit error:', err);
      alert('❌ ' + (err.response?.data?.message || 'Error saving changes'));
    }
  };

  // ===== QR SCANNER FUNCTIONS =====

  // Helper to get local date string YYYY-MM-DD (avoids UTC timezone issues)
  const toLocalDateStr = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if QR scanning should be enabled (event day, from 12:01 AM local time)
  const isQRScanEnabled = (event) => {
    if (!event) return false;
    const todayStr = toLocalDateStr(new Date());

    // Check if today is within event date range
    const startDate = event.startDate ? toLocalDateStr(event.startDate) : null;
    const endDate = event.endDate ? toLocalDateStr(event.endDate) : null;

    console.log('🔍 QR Debug - today:', todayStr, 'startDate:', startDate, 'endDate:', endDate);
    console.log('🔍 QR Debug - eventSessions:', event.eventSessions);
    console.log('🔍 QR Debug - raw startDate:', event.startDate, 'raw endDate:', event.endDate);

    // Also check event sessions
    let isEventDay = false;
    if (startDate && endDate) {
      isEventDay = todayStr >= startDate && todayStr <= endDate;
      console.log('🔍 QR Debug - startDate/endDate check:', isEventDay);
    } else if (startDate) {
      // If only startDate exists (no endDate), check if today matches startDate
      isEventDay = todayStr === startDate;
      console.log('🔍 QR Debug - startDate only check:', isEventDay);
    }
    if (!isEventDay && event.eventSessions?.length > 0) {
      isEventDay = event.eventSessions.some(session => {
        const sessDate = toLocalDateStr(session.startDate);
        const sessEnd = session.endDate ? toLocalDateStr(session.endDate) : sessDate;
        console.log('🔍 QR Debug - session:', sessDate, 'to', sessEnd);
        return todayStr >= sessDate && todayStr <= sessEnd;
      });
    }

    // Also check registrationDeadline as a fallback for single-day events
    if (!isEventDay && event.registrationDeadline) {
      const deadlineDate = toLocalDateStr(event.registrationDeadline);
      // If today is on or after the deadline, the event is likely happening
      isEventDay = todayStr >= deadlineDate;
      console.log('🔍 QR Debug - deadline fallback check:', isEventDay, 'deadline:', deadlineDate);
    }

    // Also enable if event status is 'Ongoing'
    if (!isEventDay && event.status === 'Ongoing') {
      isEventDay = true;
      console.log('🔍 QR Debug - Ongoing status override');
    }

    console.log('🔍 QR Debug - FINAL isEventDay:', isEventDay);

    // Enabled as soon as the event day starts (12:01 AM)
    return isEventDay;
  };

  const getQRStatusMessage = (event) => {
    if (!event) return '';
    const todayStr = toLocalDateStr(new Date());
    
    const startDate = event.startDate ? toLocalDateStr(event.startDate) : null;
    const endDate = event.endDate ? toLocalDateStr(event.endDate) : null;

    let isEventDay = false;
    if (startDate && endDate) {
      isEventDay = todayStr >= startDate && todayStr <= endDate;
    }
    if (!isEventDay && event.eventSessions?.length > 0) {
      isEventDay = event.eventSessions.some(session => {
        const sessDate = toLocalDateStr(session.startDate);
        const sessEnd = session.endDate ? toLocalDateStr(session.endDate) : sessDate;
        return todayStr >= sessDate && todayStr <= sessEnd;
      });
    }

    if (!isEventDay) {
      const nextDate = startDate || (event.eventSessions?.[0]?.startDate ? toLocalDateStr(event.eventSessions[0].startDate) : null);
      return `🔒 QR scanning will be available on the event day (${nextDate ? new Date(nextDate).toLocaleDateString() : 'TBD'})`;
    }
    return '✅ QR scanning is available now';
  };

  // Handle photo upload for QR scanning
  const handleQRImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanLoading(true);
    setScanResult(null);
    setScanError('');

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
      const formData = new FormData();
      formData.append('image', file);

      // Step 1: Decode the QR code from image
      const { data: qrData } = await axios.post('http://localhost:5000/api/events/scan-qr', formData, config);
      
      if (!qrData.success || !qrData.payload) {
        setScanError('No QR code found in the uploaded image. Please try again.');
        setScanLoading(false);
        return;
      }

      // Step 2: Verify the ticket
      const payload = qrData.payload;
      const ticketId = payload.ticketId;
      const eventId = payload.eventId;

      if (!ticketId || !eventId) {
        setScanError('Invalid QR code format. Not a valid event ticket.');
        setScanLoading(false);
        return;
      }

      // Check if QR is for the currently viewed event
      if (eventId !== selectedEventDetails._id) {
        setScanError(`⚠️ This ticket is for a different event (Event ID: ${eventId}). Currently viewing: ${selectedEventDetails.name}`);
        setScanLoading(false);
        return;
      }

      const verifyConfig = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: verifyData } = await axios.post(
        `http://localhost:5000/api/events/verify-ticket/${eventId}`,
        { ticketId },
        verifyConfig
      );

      setScanResult(verifyData);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Error scanning QR code';
      setScanError(errMsg);
      if (err.response?.data?.verified === false) {
        setScanResult(err.response.data);
      }
    } finally {
      setScanLoading(false);
    }
  };

  // Start camera for live QR scanning
  const startCamera = async () => {
    setScanResult(null);
    setScanError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setScanError('Could not access camera. Please check permissions or use the upload option.');
    }
  };

  // Scan a single frame from the camera feed
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image as a blob and send to backend
    canvas.toBlob(async (blob) => {
      if (!blob || scanLoading) return;

      try {
        setScanLoading(true);
        const config = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
        const formData = new FormData();
        formData.append('image', blob, 'frame.png');

        const { data: qrData } = await axios.post('http://localhost:5000/api/events/scan-qr', formData, config);
        
        if (qrData.success && qrData.payload && qrData.payload.ticketId) {
          // QR found! Stop scanning and verify
          stopCamera();

          const payload = qrData.payload;
          if (payload.eventId !== selectedEventDetails._id) {
            setScanError(`⚠️ This ticket is for a different event.`);
            setScanLoading(false);
            return;
          }

          const verifyConfig = { headers: { Authorization: `Bearer ${user.token}` } };
          const { data: verifyData } = await axios.post(
            `http://localhost:5000/api/events/verify-ticket/${payload.eventId}`,
            { ticketId: payload.ticketId },
            verifyConfig
          );
          setScanResult(verifyData);
        }
      } catch (err) {
        // Silent fail for frames — keep scanning
        if (err.response?.data?.verified === false) {
          stopCamera();
          setScanResult(err.response.data);
        }
      } finally {
        setScanLoading(false);
      }
    }, 'image/png');
  }, [cameraActive, scanLoading, user, selectedEventDetails]);

  // Attach stream to video element once camera is active and video element is rendered
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.error('Video play error:', err));

      // Start scanning frames
      scanIntervalRef.current = setInterval(() => {
        scanFrame();
      }, 500);
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraActive, scanFrame]);

  // Stop camera
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Cleanup camera on unmount or when scanner is closed
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Create Event Form Submission
  const handleCreateEvent = async (e, status = 'Published') => {
    e.preventDefault();

    // For drafts, only name and description are required
    if (status === 'Published') {
      // Validate all mandatory fields for published events
      if (eventSessions.length === 0 || !eventSessions[0].startDate || !eventSessions[0].endDate) {
        alert('Please add at least one event session with start and end dates');
        return;
      }
      if (!formData.eligibility || !formData.registrationDeadline || !formData.registrationLimit || !formData.venue) {
        alert('For published events, eligibility, registration deadline, registration limit, and venue are required');
        return;
      }
    }

    // Basic validation for drafts
    if (!formData.name || !formData.description) {
      alert('Event name and description are required');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      // Prepare event sessions with combined date and time (if any)
      const formattedSessions = eventSessions
        .filter(session => session.startDate && session.endDate)
        .map(session => ({
          sessionName: session.sessionName || 'Main Session',
          startDate: new Date(`${session.startDate}T${session.startTime || '00:00'}`),
          endDate: new Date(`${session.endDate}T${session.endTime || '23:59'}`),
          venue: session.venue || formData.venue
        }));

      // Prepare data
      const eventData = { 
        ...formData,
        status, // Set the status (Draft or Published)
        eventSessions: formattedSessions,
        customFields: customFields.filter(f => f.fieldName), // Only include fields with names
        // For backwards compatibility, set startDate/endDate from first session
        startDate: formattedSessions.length > 0 ? formattedSessions[0].startDate : undefined,
        endDate: formattedSessions.length > 0 ? formattedSessions[formattedSessions.length - 1].endDate : undefined
      };
      
      // For team events, add team details and make min/max mandatory
      if (formData.type === 'Team') {
        if (!formData.minTeamSize || !formData.maxTeamSize) {
          alert('Team events require minimum and maximum team size');
          return;
        }
        eventData.teamDetails = {
          minTeamSize: parseInt(formData.minTeamSize),
          maxTeamSize: parseInt(formData.maxTeamSize),
          requiresPOC: true
        };
      }
      
      await axios.post('http://localhost:5000/api/events', eventData, config);
      
      alert(status === 'Draft' ? "💾 Event Saved as Draft!" : "🎉 Event Published Successfully!");
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'Normal',
        eligibility: '',
        registrationDeadline: '',
        registrationLimit: '',
        registrationFee: '',
        venue: '',
        tags: '',
        minTeamSize: '',
        maxTeamSize: ''
      });
      setEventSessions([{ sessionName: '', startDate: '', startTime: '', endDate: '', endTime: '', venue: '' }]);
      setCustomFields([]);
      
      // Refresh events list
      const eventRes = await axios.get('http://localhost:5000/api/events/my-events', config);
      setMyEvents(eventRes.data);
      
      // Switch to published events tab
      setActiveTab('published');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error creating event. Check all fields.");
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // Handle profile update
  const handleSaveProfile = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put('http://localhost:5000/api/users/profile', profileData, config);
      alert('✅ Profile updated successfully!');
      setIsEditingProfile(false);
      
      // Refresh profile data
      const profileRes = await axios.get('http://localhost:5000/api/users/profile', config);
      setProfileData({
        organizerName: profileRes.data.organizerName || '',
        category: profileRes.data.category || '',
        description: profileRes.data.description || '',
        contactNumber: profileRes.data.contactNumber || '',
        contactEmail: profileRes.data.contactEmail || '',
        discordWebhook: profileRes.data.discordWebhook || ''
      });
    } catch (err) {
      alert('❌ Error updating profile: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  // Helper function to get status badge style
  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    };

    const statusColors = {
      'Draft': { background: '#e0e0e0', color: '#666' },
      'Published': { background: '#2196F3', color: 'white' },
      'Ongoing': { background: '#4CAF50', color: 'white' },
      'Closed': { background: '#f44336', color: 'white' }
    };

    return { ...baseStyle, ...(statusColors[status] || statusColors['Draft']) };
  };

  return (
    <div style={containerStyle}>
      {/* Top Navigation Bar with Tabs */}
      <nav style={navStyle}>
        <div style={navBrandStyle}>
          <span style={navIconStyle}>🎭</span>
          <h2 style={navTitleStyle}>Organizer Portal</h2>
        </div>
        <div style={navMenuStyle}>
          <button 
            onClick={() => setActiveTab('published')} 
            style={activeTab === 'published' ? activeNavButtonStyle : navButtonStyle}
          >
            📅 Published Events
          </button>
          <button 
            onClick={() => setActiveTab('create')} 
            style={activeTab === 'create' ? activeNavButtonStyle : navButtonStyle}
          >
            ➕ Create Event
          </button>
          <button 
            onClick={() => setActiveTab('analytics')} 
            style={activeTab === 'analytics' ? activeNavButtonStyle : navButtonStyle}
          >
            📊 Analytics
          </button>
          <button 
            onClick={() => { setActiveTab('profile'); setIsEditingProfile(false); }} 
            style={activeTab === 'profile' ? activeNavButtonStyle : navButtonStyle}
          >
            ⚙️ Profile
          </button>
        </div>
        <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>
      </nav>

      <div style={contentStyle}>
        {/* Published Events Tab */}
        {activeTab === 'published' && (
          <>
            <div style={welcomeBoxStyle}>
              <h1>Welcome, {user?.organizerName}! 👋</h1>
              <p>Manage your club events and followers here.</p>
            </div>

            {/* Follower List */}
            <div style={profileCardStyle}>
              <h3 style={profileHeaderStyle}>👥 Followers ({followers.length})</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {followers.length > 0 ? (
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followers.map(f => {
                        const firstName = f.firstName || '';
                        const lastName = f.lastName || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        const displayName = fullName || f.email?.split('@')[0] || 'User';
                        
                        return (
                          <tr key={f._id || f.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '12px' }}>{displayName}</td>
                            <td style={{ padding: '12px', color: '#666' }}>{f.email || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    <p style={{ fontSize: '1.1rem', margin: '10px 0' }}>👥 No followers yet</p>
                    <p style={{ fontSize: '0.9rem' }}>Share your club to get followers!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Event List */}
            <div style={eventSectionStyle}>
              <div style={eventHeaderStyle}>
                <h3>📅 Your Events ({myEvents.length})</h3>
              </div>

              {/* Status Filter Buttons */}
              {myEvents.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {['All', 'Draft', 'Published', 'Ongoing', 'Closed'].map(status => {
                    const count = status === 'All' 
                      ? myEvents.length 
                      : myEvents.filter(e => (e.status || 'Draft') === status).length;
                    const isActive = statusFilter === status;
                    const statusColors = {
                      'All': { bg: '#667eea', activeBg: '#667eea' },
                      'Draft': { bg: '#e0e0e0', activeBg: '#9e9e9e', textColor: '#666' },
                      'Published': { bg: '#bbdefb', activeBg: '#2196F3' },
                      'Ongoing': { bg: '#c8e6c9', activeBg: '#4CAF50' },
                      'Closed': { bg: '#ffcdd2', activeBg: '#f44336' }
                    };
                    const colors = statusColors[status];
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        style={{
                          padding: '8px 18px',
                          background: isActive ? colors.activeBg : colors.bg,
                          color: isActive ? 'white' : (colors.textColor || '#333'),
                          border: 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s ease',
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)'
                        }}
                      >
                        {status} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
              
              {myEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                  <p style={{ fontSize: '3rem', margin: '0 0 20px 0' }}>📭</p>
                  <p style={{ fontSize: '1.2rem', margin: '10px 0' }}>No events created yet</p>
                  <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Create your first event to get started!</p>
                  <button onClick={() => setActiveTab('create')} style={createEventButtonStyle}>
                    ➕ Create Your First Event
                  </button>
                </div>
              ) : (
                <div style={eventListGridStyle}>
                  {myEvents
                    .filter(event => statusFilter === 'All' || (event.status || 'Draft') === statusFilter)
                    .map((event) => (
                    <div 
                      key={event._id} 
                      style={eventItemCardStyle}
                      onClick={() => fetchEventDetails(event._id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: '0', color: '#333' }}>{event.name}</h4>
                        <span style={getStatusBadgeStyle(event.status || 'Draft')}>
                          {event.status || 'Draft'}
                        </span>
                      </div>
                      <p style={{ margin: '5px 0', color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>
                        {event.type === 'Merchandise' ? '🛍️ Merchandise' : event.type === 'Team' ? '👥 Team Event' : '👤 Individual'}
                      </p>
                      {event.startDate && (
                        <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
                          🕒 {new Date(event.startDate).toLocaleDateString()}
                        </p>
                      )}
                      <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
                        👥 {event.participants?.length || 0} / {event.registrationLimit || 'N/A'} registered
                      </p>
                      <p style={{ margin: '10px 0 0 0', color: '#667eea', fontSize: '0.85rem', fontWeight: '600' }}>
                        Click to view details →
                      </p>
                    </div>
                  ))}
                  {myEvents.filter(event => statusFilter === 'All' || (event.status || 'Draft') === statusFilter).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#999' }}>
                      <p style={{ fontSize: '1.1rem' }}>No {statusFilter} events found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Create Event Tab */}
        {activeTab === 'create' && (
          <div style={formBoxStyle}>
            <h2 style={formTitleStyle}>🆕 Create New Event</h2>
            <form onSubmit={handleCreateEvent} style={gridFormStyle}>
              
              <input 
                type="text" 
                placeholder="Event Name" 
                style={inputStyle} 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
              
              <select 
                style={inputStyle} 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Normal">Normal Event (Individual)</option>
                <option value="Team">Team Event</option>
                <option value="Merchandise">Merchandise Event</option>
              </select>

              <textarea 
                placeholder="Event Description" 
                style={{...inputStyle, gridColumn: 'span 2', minHeight: '100px'}} 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})} 
                required 
              />

              {/* Team Event Specific Fields */}
              {formData.type === 'Team' && (
                <>
                  <input 
                    type="number" 
                    placeholder="Minimum Team Size (e.g., 2)" 
                    style={inputStyle} 
                    value={formData.minTeamSize}
                    onChange={e => setFormData({...formData, minTeamSize: e.target.value})} 
                    required 
                    min="1"
                  />
                  
                  <input 
                    type="number" 
                    placeholder="Maximum Team Size (e.g., 4)" 
                    style={inputStyle} 
                    value={formData.maxTeamSize}
                    onChange={e => setFormData({...formData, maxTeamSize: e.target.value})} 
                    required 
                    min={formData.minTeamSize || "1"}
                  />
                  
                  <div style={{...infoBoxStyle, gridColumn: 'span 2'}}>
                    <p style={{margin: 0, fontSize: '0.9rem', color: '#666'}}>
                      ℹ️ <strong>Team Registration:</strong> Participants will register as teams with {formData.minTeamSize || 'X'}-{formData.maxTeamSize || 'Y'} members. 
                      Registration fee will be charged per participant (Total = Fee × Team Size).
                    </p>
                  </div>
                </>
              )}

              <input 
                type="text" 
                placeholder="Eligibility (e.g. All Students)" 
                style={inputStyle} 
                value={formData.eligibility}
                onChange={e => setFormData({...formData, eligibility: e.target.value})} 
                required 
              />
              
              <input 
                type="number" 
                placeholder={formData.type === 'Team' ? 'Registration Limit (Number of Teams)' : 'Registration Limit'} 
                style={inputStyle} 
                value={formData.registrationLimit}
                onChange={e => setFormData({...formData, registrationLimit: e.target.value})} 
                required 
              />

              <input 
                type="number" 
                placeholder={formData.type === 'Team' ? 'Registration Fee per Participant (₹)' : 'Registration Fee (₹)'} 
                style={inputStyle} 
                value={formData.registrationFee}
                onChange={e => setFormData({...formData, registrationFee: e.target.value})} 
                required 
              />

              <input 
                type="text" 
                placeholder="Venue / Location" 
                style={inputStyle} 
                value={formData.venue}
                onChange={e => setFormData({...formData, venue: e.target.value})} 
                required 
              />

              <input 
                type="text" 
                placeholder="Tags (comma separated)" 
                style={inputStyle} 
                value={formData.tags}
                onChange={e => setFormData({...formData, tags: e.target.value.split(',')})} 
              />

              <div style={dateGroup}>
                <label style={labelStyle}>Registration Deadline *</label>
                <input 
                  type="datetime-local" 
                  style={inputStyle} 
                  value={formData.registrationDeadline}
                  onChange={e => setFormData({...formData, registrationDeadline: e.target.value})} 
                  required 
                />
              </div>

              {/* Event Sessions Section */}
              <div style={{gridColumn: 'span 2', marginTop: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h3 style={{margin: 0, color: '#333'}}>📅 Event Sessions *</h3>
                  <button 
                    type="button"
                    style={addButtonStyle}
                    onClick={addSession}
                  >
                    + Add Session
                  </button>
                </div>
                <p style={{margin: '0 0 15px 0', fontSize: '0.9rem', color: '#666'}}>
                  Add multiple sessions if your event spans different days/times (e.g., Day 1: 2-5pm, Day 2: 2-5pm)
                </p>

                {eventSessions.map((session, index) => (
                  <div key={index} style={{
                    background: '#f9f9f9',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    border: '2px solid #eee'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <h4 style={{margin: 0, color: '#667eea'}}>Session {index + 1}</h4>
                      {eventSessions.length > 1 && (
                        <button 
                          type="button"
                          style={removeButtonStyle}
                          onClick={() => removeSession(index)}
                        >
                          🗑️ Remove
                        </button>
                      )}
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px'}}>
                      <input 
                        type="text"
                        style={inputStyle}
                        placeholder="Session Name (optional, e.g., 'Day 1', 'Opening Ceremony')"
                        value={session.sessionName}
                        onChange={(e) => updateSession(index, 'sessionName', e.target.value)}
                      />
                      <input 
                        type="text"
                        style={inputStyle}
                        placeholder="Venue (optional)"
                        value={session.venue}
                        onChange={(e) => updateSession(index, 'venue', e.target.value)}
                      />
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px'}}>
                      <div>
                        <label style={{...labelStyle, fontSize: '0.8rem'}}>Start Date *</label>
                        <input 
                          type="date"
                          style={inputStyle}
                          value={session.startDate}
                          onChange={(e) => updateSession(index, 'startDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={{...labelStyle, fontSize: '0.8rem'}}>Start Time</label>
                        <input 
                          type="time"
                          style={inputStyle}
                          value={session.startTime}
                          onChange={(e) => updateSession(index, 'startTime', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{...labelStyle, fontSize: '0.8rem'}}>End Date *</label>
                        <input 
                          type="date"
                          style={inputStyle}
                          value={session.endDate}
                          onChange={(e) => updateSession(index, 'endDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={{...labelStyle, fontSize: '0.8rem'}}>End Time</label>
                        <input 
                          type="time"
                          style={inputStyle}
                          value={session.endTime}
                          onChange={(e) => updateSession(index, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Fields Section — Form Builder */}
              <div style={{gridColumn: 'span 2', marginTop: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h3 style={{margin: 0, color: '#333'}}>🛠️ Registration Form Builder (Optional)</h3>
                  <button 
                    type="button"
                    style={addButtonStyle}
                    onClick={addCustomField}
                  >
                    + Add Field
                  </button>
                </div>
                <p style={{margin: '0 0 15px 0', fontSize: '0.9rem', color: '#666'}}>
                  Build a custom registration form. Add fields, set types, mark as required, and drag to reorder.
                  Supported types: Text, Long Text, Number, Date, Email, Phone, Dropdown, Checkbox, and File Upload.
                </p>
                <p style={{margin: '0 0 15px 0', fontSize: '0.85rem', color: '#e65100', fontWeight: '600'}}>
                  ⚠️ The form will be <strong>locked</strong> after the first participant registers — no further edits to fields allowed.
                </p>

                {customFields.length > 0 && customFields.map((field, index) => (
                  <div key={index} style={{
                    background: '#f0f4ff',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    border: '2px solid #90caf9',
                    position: 'relative'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        {/* Reorder Buttons */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                          <button 
                            type="button"
                            onClick={() => moveCustomField(index, -1)}
                            disabled={index === 0}
                            style={{
                              background: index === 0 ? '#ddd' : '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              lineHeight: '1'
                            }}
                            title="Move Up"
                          >▲</button>
                          <button 
                            type="button"
                            onClick={() => moveCustomField(index, 1)}
                            disabled={index === customFields.length - 1}
                            style={{
                              background: index === customFields.length - 1 ? '#ddd' : '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: index === customFields.length - 1 ? 'not-allowed' : 'pointer',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              lineHeight: '1'
                            }}
                            title="Move Down"
                          >▼</button>
                        </div>
                        <h4 style={{margin: 0, color: '#667eea'}}>Field {index + 1}</h4>
                        {field.isRequired && <span style={{color: '#f44336', fontSize: '0.75rem', fontWeight: '700', background: '#ffebee', padding: '2px 8px', borderRadius: '10px'}}>REQUIRED</span>}
                      </div>
                      <button 
                        type="button"
                        style={removeButtonStyle}
                        onClick={() => removeCustomField(index)}
                      >
                        🗑️ Remove
                      </button>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px'}}>
                      <input 
                        type="text"
                        style={inputStyle}
                        placeholder="Field Name (e.g., 'T-Shirt Size', 'Resume Upload')"
                        value={field.fieldName}
                        onChange={(e) => updateCustomField(index, 'fieldName', e.target.value)}
                      />
                      <select 
                        style={inputStyle}
                        value={field.fieldType}
                        onChange={(e) => updateCustomField(index, 'fieldType', e.target.value)}
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
                      {field.fieldType !== 'FileUpload' && field.fieldType !== 'Checkbox' && (
                        <input 
                          type="text"
                          style={inputStyle}
                          placeholder="Placeholder text (optional)"
                          value={field.placeholder}
                          onChange={(e) => updateCustomField(index, 'placeholder', e.target.value)}
                        />
                      )}
                      {(field.fieldType === 'FileUpload' || field.fieldType === 'Checkbox') && (
                        <div style={{padding: '10px', fontSize: '0.85rem', color: '#888'}}>
                          {field.fieldType === 'FileUpload' ? '📎 Participants will upload a file' : '☑️ Participants will check/uncheck'}
                        </div>
                      )}
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px'}}>
                        <input 
                          type="checkbox"
                          checked={field.isRequired}
                          onChange={(e) => updateCustomField(index, 'isRequired', e.target.checked)}
                          style={{width: '18px', height: '18px'}}
                        />
                        <span style={{fontSize: '0.9rem', color: '#666'}}>Required Field</span>
                      </label>
                    </div>

                    {(field.fieldType === 'Dropdown') && (
                      <div style={{marginTop: '10px'}}>
                        <input 
                          type="text"
                          style={inputStyle}
                          placeholder="Dropdown options (comma separated, e.g., 'S, M, L, XL')"
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => updateCustomFieldOptions(index, e.target.value)}
                        />
                        {field.options?.length > 0 && (
                          <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px'}}>
                            {field.options.map((opt, oi) => (
                              <span key={oi} style={{background: '#667eea', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem'}}>{opt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preview */}
                    <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px dashed #ccc'}}>
                      <div style={{fontSize: '0.75rem', color: '#999', marginBottom: '4px', fontWeight: '600'}}>PREVIEW:</div>
                      <label style={{fontSize: '0.9rem', fontWeight: '600', color: '#333'}}>
                        {field.fieldName || 'Field Name'} {field.isRequired && <span style={{color: '#f44336'}}>*</span>}
                      </label>
                      {field.fieldType === 'Text' && <input type="text" disabled placeholder={field.placeholder || 'Text input'} style={{...inputStyle, opacity: 0.6, marginTop: '4px'}} />}
                      {field.fieldType === 'Textarea' && <textarea disabled placeholder={field.placeholder || 'Long text input'} style={{...inputStyle, opacity: 0.6, marginTop: '4px', minHeight: '60px'}} />}
                      {field.fieldType === 'Number' && <input type="number" disabled placeholder={field.placeholder || '0'} style={{...inputStyle, opacity: 0.6, marginTop: '4px'}} />}
                      {field.fieldType === 'Date' && <input type="date" disabled style={{...inputStyle, opacity: 0.6, marginTop: '4px'}} />}
                      {field.fieldType === 'Email' && <input type="email" disabled placeholder={field.placeholder || 'email@example.com'} style={{...inputStyle, opacity: 0.6, marginTop: '4px'}} />}
                      {field.fieldType === 'Phone' && <input type="tel" disabled placeholder={field.placeholder || '+91 9876543210'} style={{...inputStyle, opacity: 0.6, marginTop: '4px'}} />}
                      {field.fieldType === 'Dropdown' && (
                        <select disabled style={{...inputStyle, opacity: 0.6, marginTop: '4px'}}>
                          <option>Select...</option>
                          {(field.options || []).map((opt, oi) => <option key={oi}>{opt}</option>)}
                        </select>
                      )}
                      {field.fieldType === 'Checkbox' && (
                        <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', opacity: 0.6}}>
                          <input type="checkbox" disabled /> {field.fieldName || 'Checkbox'}
                        </label>
                      )}
                      {field.fieldType === 'FileUpload' && (
                        <input type="file" disabled style={{...inputStyle, opacity: 0.6, marginTop: '4px'}} />
                      )}
                    </div>
                  </div>
                ))}

                {customFields.length === 0 && (
                  <div style={{textAlign: 'center', padding: '30px', background: '#fafafa', borderRadius: '8px', border: '2px dashed #ddd'}}>
                    <p style={{fontSize: '1.1rem', color: '#999', margin: '0 0 10px 0'}}>📋 No custom fields added yet</p>
                    <p style={{fontSize: '0.85rem', color: '#bbb', margin: 0}}>Click "+ Add Field" to build your registration form</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <button type="button" onClick={(e) => handleCreateEvent(e, 'Draft')} style={draftButtonStyle}>
                  💾 Save as Draft
                </button>
                <button type="button" onClick={(e) => handleCreateEvent(e, 'Published')} style={submitButtonStyle}>
                  🚀 Publish Event
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Event Details Tab - Participant List */}
        {activeTab === 'details' && selectedEventDetails && (
          <div style={detailsContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button 
                onClick={() => { setActiveTab('published'); setIsEditing(false); }} 
                style={backButtonStyle}
              >
                ← Back to Events
              </button>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Refresh Button */}
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered');
                    fetchEventDetails(selectedEventDetails._id);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  🔄 Refresh
                </button>
                
                {/* Edit Button - shown based on status rules */}
                {(selectedEventDetails.status !== 'Closed' && selectedEventDetails.status !== 'Completed') && !isEditing && (
                  <button 
                    onClick={startEditing} 
                    style={{ ...publishDraftButtonStyle, background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)' }}
                  >
                    ✏️ Edit Event
                  </button>
                )}
                
                {/* Show Publish button for Draft events */}
                {selectedEventDetails.status === 'Draft' && !isEditing && (
                  <button 
                    onClick={() => handlePublishDraft(selectedEventDetails._id)} 
                    style={publishDraftButtonStyle}
                  >
                    🚀 Publish Event
                  </button>
                )}
              </div>
            </div>
            
            <div style={detailsHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2 style={{ margin: '0', color: '#333' }}>{selectedEventDetails.name}</h2>
                <span style={getStatusBadgeStyle(selectedEventDetails.status || 'Draft')}>
                  {selectedEventDetails.status || 'Draft'}
                </span>
              </div>
              {selectedEventDetails.startDate && (
                <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '1rem' }}>
                  📅 {new Date(selectedEventDetails.startDate).toLocaleDateString()} - {new Date(selectedEventDetails.endDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Draft Warning */}
            {selectedEventDetails.status === 'Draft' && (
              <div style={{ 
                background: '#fff3cd', 
                border: '1px solid #ffc107', 
                padding: '15px 20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <strong style={{ color: '#856404' }}>Draft Event</strong>
                  <p style={{ margin: '5px 0 0 0', color: '#856404', fontSize: '0.9rem' }}>
                    This event is not visible to participants yet. Complete all required fields and click "Publish Event" to make it live.
                  </p>
                </div>
              </div>
            )}

            {/* ===== EDIT PANEL ===== */}
            {isEditing && (
              <div style={{
                background: 'linear-gradient(135deg, #fff8e1 0%, #ffffff 100%)',
                border: '2px solid #ff9800',
                borderRadius: '12px',
                padding: '25px',
                marginBottom: '25px',
                boxShadow: '0 4px 20px rgba(255, 152, 0, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: '#e65100' }}>✏️ Edit Event</h3>
                  <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc02' }}>
                    {(selectedEventDetails.status || 'Draft') === 'Draft' 
                      ? '🟢 All fields editable' 
                      : (selectedEventDetails.status || 'Draft') === 'Published' 
                        ? '🟡 Limited edits: Description, Deadline (extend), Limit (increase), Status' 
                        : '🔴 Only status change allowed'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                  {/* Event Name - Draft only */}
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={editLabelStyle}>Event Name</label>
                    <input
                      type="text"
                      style={{ ...editInputStyle, ...(selectedEventDetails.status !== 'Draft' ? disabledInputStyle : {}) }}
                      value={editData.name || ''}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                      disabled={selectedEventDetails.status !== 'Draft'}
                    />
                  </div>

                  {/* Venue - Draft only */}
                  <div>
                    <label style={editLabelStyle}>Venue</label>
                    <input
                      type="text"
                      style={{ ...editInputStyle, ...(selectedEventDetails.status !== 'Draft' ? disabledInputStyle : {}) }}
                      value={editData.venue || ''}
                      onChange={e => setEditData({ ...editData, venue: e.target.value })}
                      disabled={selectedEventDetails.status !== 'Draft'}
                    />
                  </div>

                  {/* Description - Draft & Published */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={editLabelStyle}>Description {selectedEventDetails.status === 'Published' && <span style={{ color: '#4caf50', fontSize: '0.75rem' }}>✓ Editable</span>}</label>
                    <textarea
                      style={{ ...editInputStyle, minHeight: '80px', ...(selectedEventDetails.status === 'Ongoing' ? disabledInputStyle : {}) }}
                      value={editData.description || ''}
                      onChange={e => setEditData({ ...editData, description: e.target.value })}
                      disabled={selectedEventDetails.status === 'Ongoing'}
                    />
                  </div>

                  {/* Eligibility - Draft only */}
                  <div>
                    <label style={editLabelStyle}>Eligibility</label>
                    <input
                      type="text"
                      style={{ ...editInputStyle, ...(selectedEventDetails.status !== 'Draft' ? disabledInputStyle : {}) }}
                      value={editData.eligibility || ''}
                      onChange={e => setEditData({ ...editData, eligibility: e.target.value })}
                      disabled={selectedEventDetails.status !== 'Draft'}
                    />
                  </div>

                  {/* Registration Fee - Draft only */}
                  <div>
                    <label style={editLabelStyle}>Registration Fee (₹)</label>
                    <input
                      type="number"
                      style={{ ...editInputStyle, ...(selectedEventDetails.status !== 'Draft' ? disabledInputStyle : {}) }}
                      value={editData.registrationFee || ''}
                      onChange={e => setEditData({ ...editData, registrationFee: e.target.value })}
                      disabled={selectedEventDetails.status !== 'Draft'}
                    />
                  </div>

                  {/* Registration Deadline - Draft & Published (extend only) */}
                  <div>
                    <label style={editLabelStyle}>
                      Registration Deadline 
                      {selectedEventDetails.status === 'Published' && <span style={{ color: '#4caf50', fontSize: '0.75rem' }}> ✓ Extend only</span>}
                    </label>
                    <input
                      type="datetime-local"
                      style={{ ...editInputStyle, ...(selectedEventDetails.status === 'Ongoing' ? disabledInputStyle : {}) }}
                      value={editData.registrationDeadline || ''}
                      onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value })}
                      disabled={selectedEventDetails.status === 'Ongoing'}
                      min={selectedEventDetails.status === 'Published' && selectedEventDetails.registrationDeadline 
                        ? new Date(selectedEventDetails.registrationDeadline).toISOString().slice(0, 16) 
                        : undefined}
                    />
                  </div>

                  {/* Registration Limit - Draft & Published (increase only) */}
                  <div>
                    <label style={editLabelStyle}>
                      Registration Limit 
                      {selectedEventDetails.status === 'Published' && <span style={{ color: '#4caf50', fontSize: '0.75rem' }}> ✓ Increase only</span>}
                    </label>
                    <input
                      type="number"
                      style={{ ...editInputStyle, ...(selectedEventDetails.status === 'Ongoing' ? disabledInputStyle : {}) }}
                      value={editData.registrationLimit || ''}
                      onChange={e => setEditData({ ...editData, registrationLimit: e.target.value })}
                      disabled={selectedEventDetails.status === 'Ongoing'}
                      min={selectedEventDetails.status === 'Published' ? (selectedEventDetails.registrationLimit || 0) : undefined}
                    />
                  </div>

                  {/* Tags - Draft only */}
                  <div>
                    <label style={editLabelStyle}>Tags (comma separated)</label>
                    <input
                      type="text"
                      style={{ ...editInputStyle, ...(selectedEventDetails.status !== 'Draft' ? disabledInputStyle : {}) }}
                      value={editData.tags || ''}
                      onChange={e => setEditData({ ...editData, tags: e.target.value })}
                      disabled={selectedEventDetails.status !== 'Draft'}
                    />
                  </div>

                  {/* Status Change - Published & Ongoing */}
                  {(selectedEventDetails.status === 'Published' || selectedEventDetails.status === 'Ongoing') && (
                    <div>
                      <label style={editLabelStyle}>Change Status <span style={{ color: '#4caf50', fontSize: '0.75rem' }}>✓ Editable</span></label>
                      <select
                        style={editInputStyle}
                        value={editData.status || selectedEventDetails.status}
                        onChange={e => setEditData({ ...editData, status: e.target.value })}
                      >
                        <option value={selectedEventDetails.status}>{selectedEventDetails.status} (current)</option>
                        {selectedEventDetails.status === 'Published' && (
                          <>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Closed">Closed</option>
                          </>
                        )}
                        {selectedEventDetails.status === 'Ongoing' && (
                          <>
                            <option value="Completed">Completed</option>
                            <option value="Closed">Closed</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Save / Cancel buttons */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setIsEditing(false)}
                    style={{ padding: '12px 24px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    style={{ padding: '12px 30px', background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem', boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)' }}
                  >
                    💾 Save Changes
                  </button>
                </div>
              </div>
            )}

            <div style={detailsCardStyle}>
              <h3 style={sectionTitleStyle}>📋 Event Information</h3>
              <div style={infoGridStyle}>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Type:</span>
                  <span style={infoValueStyle}>{selectedEventDetails.type}</span>
                </div>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Category:</span>
                  <span style={infoValueStyle}>{selectedEventDetails.category || 'N/A'}</span>
                </div>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Registration Fee:</span>
                  <span style={infoValueStyle}>₹{selectedEventDetails.registrationFee || 0}{selectedEventDetails.type === 'Team' ? ' per participant' : ''}</span>
                </div>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Eligibility:</span>
                  <span style={infoValueStyle}>{selectedEventDetails.eligibility || <span style={{ color: '#f44336', fontStyle: 'italic' }}>Not Set</span>}</span>
                </div>
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Venue:</span>
                  <span style={infoValueStyle}>{selectedEventDetails.venue || <span style={{ color: '#f44336', fontStyle: 'italic' }}>Not Set</span>}</span>
                </div>
                {selectedEventDetails.type === 'Team' ? (
                  <>
                    <div style={infoItemStyle}>
                      <span style={infoLabelStyle}>Team Size:</span>
                      <span style={infoValueStyle}>
                        {selectedEventDetails.teamDetails?.minTeamSize && selectedEventDetails.teamDetails?.maxTeamSize 
                          ? `${selectedEventDetails.teamDetails.minTeamSize} - ${selectedEventDetails.teamDetails.maxTeamSize} members`
                          : <span style={{ color: '#f44336', fontStyle: 'italic' }}>Not Set</span>
                        }
                      </span>
                    </div>
                    <div style={infoItemStyle}>
                      <span style={infoLabelStyle}>Total Teams Registered:</span>
                      <span style={infoValueStyle}>
                        {selectedEventDetails.teamRegistrations?.length || 0} / {selectedEventDetails.registrationLimit || 'Not Set'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={infoItemStyle}>
                    <span style={infoLabelStyle}>Total Registered:</span>
                    <span style={infoValueStyle}>
                      {selectedEventDetails.participants?.length || 0} / {selectedEventDetails.registrationLimit || 'Not Set'}
                    </span>
                  </div>
                )}
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>Registration Deadline:</span>
                  <span style={infoValueStyle}>
                    {selectedEventDetails.registrationDeadline 
                      ? new Date(selectedEventDetails.registrationDeadline).toLocaleDateString()
                      : <span style={{ color: '#f44336', fontStyle: 'italic' }}>Not Set</span>
                    }
                  </span>
                </div>
                {selectedEventDetails.customFields && selectedEventDetails.customFields.length > 0 && (
                  <div style={infoItemStyle}>
                    <span style={infoLabelStyle}>Custom Form Fields:</span>
                    <span style={infoValueStyle}>
                      {selectedEventDetails.customFields.length} fields
                      {selectedEventDetails.formLocked && (
                        <span style={{ marginLeft: '8px', background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700' }}>🔒 LOCKED</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {selectedEventDetails.description && (
                <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <span style={infoLabelStyle}>Description:</span>
                  <p style={{ margin: '10px 0 0 0', lineHeight: '1.6', color: '#555' }}>
                    {selectedEventDetails.description}
                  </p>
                </div>
              )}
            </div>

            {/* Team Registrations or Individual Participants */}
            {selectedEventDetails.type === 'Team' ? (
              <div style={participantsCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <h3 style={sectionTitleStyle}>👥 Registered Teams ({selectedEventDetails.teamRegistrations?.length || 0})</h3>
                  
                  {/* Team Attendance Stats */}
                  {selectedEventDetails.teamRegistrations && selectedEventDetails.teamRegistrations.length > 0 && (() => {
                    const allMembers = selectedEventDetails.teamRegistrations.flatMap(team => 
                      team.members.map(m => m.email)
                    );
                    
                    // Use attendance API data if available
                    let attendedMembers = 0;
                    if (attendanceData) {
                      // Count how many team members are in the scannedParticipants list
                      attendedMembers = attendanceData.scannedParticipants?.filter(sp => 
                        allMembers.includes(sp.email)
                      ).length || 0;
                      
                      console.log('📊 Using attendance API data');
                      console.log('✅ Attended members from API:', attendedMembers);
                    } else {
                      // Fallback to checking eventTickets
                      console.log('⚠️ Attendance API data not available, using eventTickets fallback');
                      attendedMembers = selectedEventDetails.participants?.filter(p => {
                        const isTeamMember = allMembers.includes(p.email);
                        const hasScannedTicket = p.eventTickets?.some(t => 
                          t.eventId?.toString() === selectedEventDetails._id && t.scanned
                        );
                        return isTeamMember && hasScannedTicket;
                      }).length || 0;
                    }
                    
                    const totalMembers = allMembers.length;
                    
                    console.log('📊 Team attendance:', { attended: attendedMembers, total: totalMembers });
                    
                    return (
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#4caf50', color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          ✅ Attended: {attendedMembers}/{totalMembers}
                        </div>
                        <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#ff9800', color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          ⏳ Not Yet: {totalMembers - attendedMembers}/{totalMembers}
                        </div>
                        <button
                          onClick={exportAttendanceCSV}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: '#1976d2',
                            color: 'white',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#1565c0'}
                          onMouseLeave={(e) => e.target.style.background = '#1976d2'}
                        >
                          📊 Export CSV
                        </button>
                      </div>
                    );
                  })()}
                </div>
                
                {selectedEventDetails.teamRegistrations && selectedEventDetails.teamRegistrations.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {selectedEventDetails.teamRegistrations.map((team, index) => {
                      // Calculate team attendance using attendance API data if available
                      const teamAttendance = team.members.map(member => {
                        let hasScanned = false;
                        let scannedAt = null;
                        
                        if (attendanceData) {
                          // Use attendance API data
                          const scannedParticipant = attendanceData.scannedParticipants?.find(sp => sp.email === member.email);
                          hasScanned = !!scannedParticipant;
                          scannedAt = scannedParticipant?.scannedAt;
                        } else {
                          // Fallback to eventTickets
                          const participant = selectedEventDetails.participants?.find(p => p.email === member.email);
                          const ticket = participant?.eventTickets?.find(t => t.eventId?.toString() === selectedEventDetails._id);
                          hasScanned = ticket?.scanned || false;
                          scannedAt = ticket?.scannedAt;
                        }
                        
                        return {
                          ...member,
                          hasScanned,
                          scannedAt
                        };
                      });
                      const attendedCount = teamAttendance.filter(m => m.hasScanned).length;
                      
                      return (
                        <div key={index} style={{
                          background: 'white',
                          border: '2px solid #667eea',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px solid #eee' }}>
                            <div>
                              <h4 style={{ margin: '0 0 5px 0', color: '#667eea', fontSize: '1.2rem' }}>
                                🏆 {team.teamName}
                              </h4>
                              <p style={{ margin: 0, color: '#999', fontSize: '0.85rem' }}>
                                Team #{index + 1} • {team.members.length} members
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                              {/* Team Attendance Badge */}
                              <div style={{ 
                                padding: '8px 12px', 
                                borderRadius: '8px', 
                                background: attendedCount === team.members.length ? '#4caf50' : (attendedCount > 0 ? '#ff9800' : '#f44336'),
                                color: 'white',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                textAlign: 'center'
                              }}>
                                {attendedCount === team.members.length ? '✅ All Present' : 
                                 attendedCount > 0 ? `⏳ ${attendedCount}/${team.members.length}` : 
                                 '❌ None Yet'}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#999' }}>Total Fee</p>
                                <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#4caf50' }}>
                                  ₹{team.totalFee || (team.members.length * selectedEventDetails.registrationFee)}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ marginBottom: '15px', background: '#f0f4ff', padding: '12px', borderRadius: '8px' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', fontWeight: '700', color: '#666' }}>
                              📞 Point of Contact:
                            </p>
                            <p style={{ margin: '5px 0', fontSize: '1rem', fontWeight: '600', color: '#333' }}>
                              {team.pocName}
                            </p>
                            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
                              ✉️ {team.pocEmail}
                            </p>
                          </div>
                          
                          <div>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: '700', color: '#666' }}>
                              Team Members:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                              {teamAttendance.map((member, mIndex) => (
                                <div key={mIndex} style={{
                                  background: member.hasScanned ? '#e8f5e9' : '#fff3e0',
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  border: member.hasScanned ? '2px solid #4caf50' : '2px solid #ff9800',
                                  position: 'relative'
                                }}>
                                  <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    fontSize: '1.2rem'
                                  }}>
                                    {member.hasScanned ? '✅' : '⏳'}
                                  </div>
                                  <p style={{ margin: '0 0 5px 0', fontSize: '0.95rem', fontWeight: '600', color: '#333', paddingRight: '30px' }}>
                                    {mIndex + 1}. {member.name}
                                  </p>
                                  <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#666' }}>
                                    {member.email}
                                  </p>
                                  {member.hasScanned && member.scannedAt && (
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#4caf50', fontWeight: 'bold' }}>
                                      Scanned: {new Date(member.scannedAt).toLocaleString()}
                                    </p>
                                  )}
                                  {!member.hasScanned && (
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#ff9800', fontWeight: 'bold' }}>
                                      Not yet arrived
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <p style={{ fontSize: '2rem', margin: '0 0 15px 0' }}>👥</p>
                    <p style={{ fontSize: '1.1rem', margin: '0' }}>No teams registered yet</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={participantsCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={sectionTitleStyle}>👥 Registered Participants ({selectedEventDetails.participants?.length || 0})</h3>
                
                {/* Attendance Stats & Export Button */}
                {selectedEventDetails.participants && selectedEventDetails.participants.length > 0 && (
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#4caf50', color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      ✅ Attended: {selectedEventDetails.participants.filter(p => p.eventTickets?.some(t => t.eventId?.toString() === selectedEventDetails._id && t.scanned)).length}
                    </div>
                    <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#ff9800', color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      ⏳ Not Yet: {selectedEventDetails.participants.filter(p => !p.eventTickets?.some(t => t.eventId?.toString() === selectedEventDetails._id && t.scanned)).length}
                    </div>
                    <button
                      onClick={exportAttendanceCSV}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: '#1976d2',
                        color: 'white',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#1565c0'}
                      onMouseLeave={(e) => e.target.style.background = '#1976d2'}
                    >
                      📊 Export CSV
                    </button>
                  </div>
                )}
              </div>
              
              {/* Attendance Filter Buttons */}
              {selectedEventDetails.participants && selectedEventDetails.participants.length > 0 && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setAttendanceFilter('all')}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      background: attendanceFilter === 'all' ? '#667eea' : '#e0e0e0',
                      color: attendanceFilter === 'all' ? 'white' : '#333',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    All ({selectedEventDetails.participants.length})
                  </button>
                  <button
                    onClick={() => setAttendanceFilter('attended')}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      background: attendanceFilter === 'attended' ? '#4caf50' : '#e0e0e0',
                      color: attendanceFilter === 'attended' ? 'white' : '#333',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ✅ Attended ({attendanceData ? attendanceData.totalScanned : selectedEventDetails.participants.filter(p => p.eventTickets?.some(t => t.eventId?.toString() === selectedEventDetails._id && t.scanned)).length})
                  </button>
                  <button
                    onClick={() => setAttendanceFilter('notYet')}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      background: attendanceFilter === 'notYet' ? '#ff9800' : '#e0e0e0',
                      color: attendanceFilter === 'notYet' ? 'white' : '#333',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ⏳ Not Yet Arrived ({attendanceData ? attendanceData.totalNotScanned : selectedEventDetails.participants.filter(p => !p.eventTickets?.some(t => t.eventId?.toString() === selectedEventDetails._id && t.scanned)).length})
                  </button>
                </div>
              )}
              
              {selectedEventDetails.participants && selectedEventDetails.participants.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={participantTableStyle}>
                    <thead>
                      <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                        <th style={tableHeaderStyle}>#</th>
                        <th style={tableHeaderStyle}>Name</th>
                        <th style={tableHeaderStyle}>Email</th>
                        <th style={tableHeaderStyle}>Contact</th>
                        <th style={tableHeaderStyle}>College</th>
                        <th style={tableHeaderStyle}>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEventDetails.participants
                        .filter(p => {
                          let hasScanned = false;
                          
                          if (attendanceData) {
                            // Use attendance API data
                            hasScanned = attendanceData.scannedParticipants?.some(sp => sp.email === p.email);
                          } else {
                            // Fallback to eventTickets
                            hasScanned = p.eventTickets?.some(t => 
                              t.eventId?.toString() === selectedEventDetails._id && t.scanned
                            );
                          }
                          
                          if (attendanceFilter === 'attended') return hasScanned;
                          if (attendanceFilter === 'notYet') return !hasScanned;
                          return true; // 'all'
                        })
                        .map((participant, index) => {
                          let hasScanned = false;
                          let scannedAt = null;
                          
                          if (attendanceData) {
                            // Use attendance API data
                            const scannedParticipant = attendanceData.scannedParticipants?.find(sp => sp.email === participant.email);
                            hasScanned = !!scannedParticipant;
                            scannedAt = scannedParticipant?.scannedAt;
                          } else {
                            // Fallback to eventTickets
                            const ticket = participant.eventTickets?.find(t => t.eventId?.toString() === selectedEventDetails._id);
                            hasScanned = ticket?.scanned;
                            scannedAt = ticket?.scannedAt;
                          }
                          
                          console.log(`📊 Rendering ${participant.firstName}: hasScanned=${hasScanned}, scannedAt=${scannedAt}`);
                          
                          return (
                            <tr key={participant._id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={tableCellStyle}>{index + 1}</td>
                              <td style={tableCellStyle}>
                                {participant.firstName} {participant.lastName}
                              </td>
                              <td style={tableCellStyle}>{participant.email}</td>
                              <td style={tableCellStyle}>{participant.contactNumber || 'N/A'}</td>
                              <td style={tableCellStyle}>{participant.college || 'N/A'}</td>
                              <td style={tableCellStyle}>
                                {hasScanned ? (
                                  <div>
                                    <span style={{ 
                                      padding: '6px 12px', 
                                      borderRadius: '6px', 
                                      background: '#4caf50', 
                                      color: 'white', 
                                      fontSize: '0.85rem',
                                      fontWeight: 'bold',
                                      display: 'inline-block'
                                    }}>
                                      ✅ Attended
                                    </span>
                                    {scannedAt && (
                                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>
                                        {new Date(scannedAt).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ 
                                    padding: '6px 12px', 
                                    borderRadius: '6px', 
                                    background: '#ff9800', 
                                    color: 'white', 
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    display: 'inline-block'
                                  }}>
                                    ⏳ Not Yet Arrived
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <p style={{ fontSize: '2rem', margin: '0 0 15px 0' }}>👤</p>
                  <p style={{ fontSize: '1.1rem', margin: '0' }}>No participants registered yet</p>
                </div>
              )}
            </div>
            )}

            {/* ===== CUSTOM FORM FIELDS & RESPONSES ===== */}
            {selectedEventDetails.customFields && selectedEventDetails.customFields.length > 0 && (
              <div style={{
                background: 'white',
                padding: '25px',
                borderRadius: '12px',
                marginTop: '25px',
                boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
                border: selectedEventDetails.formLocked ? '2px solid #ff9800' : '2px solid #90caf9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
                    📋 Custom Registration Form ({selectedEventDetails.customFields.length} fields)
                  </h3>
                  {selectedEventDetails.formLocked && (
                    <span style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      background: '#fff3e0',
                      color: '#e65100',
                      border: '1px solid #ffcc02'
                    }}>
                      🔒 Form Locked
                    </span>
                  )}
                </div>

                {/* Show defined fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {[...(selectedEventDetails.customFields || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, idx) => (
                    <div key={idx} style={{
                      background: '#f8f9ff',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '1px solid #e0e7ff',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                        {field.fieldName} {field.isRequired && <span style={{ color: '#f44336' }}>*</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        Type: {field.fieldType}
                        {field.options?.length > 0 && ` · Options: ${field.options.join(', ')}`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show responses */}
                {selectedEventDetails.formResponses && selectedEventDetails.formResponses.length > 0 ? (
                  <div>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1rem' }}>
                      📊 Form Responses ({selectedEventDetails.formResponses.length})
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                          <tr style={{ background: '#f0f4ff', borderBottom: '2px solid #d0d7ff' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', color: '#333' }}>#</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', color: '#333' }}>Participant</th>
                            {[...(selectedEventDetails.customFields || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, idx) => (
                              <th key={idx} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', color: '#333' }}>
                                {field.fieldName}
                              </th>
                            ))}
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', color: '#333' }}>Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEventDetails.formResponses.map((resp, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>
                                <div style={{ fontWeight: '600', color: '#333' }}>{resp.participantName || 'N/A'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>{resp.participantEmail}</div>
                              </td>
                              {[...(selectedEventDetails.customFields || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, fIdx) => {
                                const responseEntry = resp.responses?.find(r => r.fieldName === field.fieldName);
                                const value = responseEntry?.value;
                                return (
                                  <td key={fIdx} style={{ padding: '10px 12px', fontSize: '0.85rem', color: '#555' }}>
                                    {field.fieldType === 'Checkbox' ? (
                                      <span>{value ? '✅ Yes' : '❌ No'}</span>
                                    ) : field.fieldType === 'FileUpload' ? (
                                      value ? <a href={value} target="_blank" rel="noreferrer" style={{ color: '#667eea' }}>📎 View File</a> : '—'
                                    ) : (
                                      <span>{value || '—'}</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#888' }}>
                                {resp.submittedAt ? new Date(resp.submittedAt).toLocaleString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', background: '#fafafa', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#999', fontSize: '0.9rem' }}>No form responses yet</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== QR TICKET SCANNER SECTION ===== */}
            <div style={{
              background: '#f9f9f9',
              padding: '25px',
              borderRadius: '12px',
              marginTop: '25px',
              border: isQRScanEnabled(selectedEventDetails) ? '2px solid #4caf50' : '2px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
                  📱 QR Ticket Scanner
                </h3>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  background: isQRScanEnabled(selectedEventDetails) ? '#e8f5e9' : '#fff3e0',
                  color: isQRScanEnabled(selectedEventDetails) ? '#2e7d32' : '#e65100',
                  border: `1px solid ${isQRScanEnabled(selectedEventDetails) ? '#a5d6a7' : '#ffcc02'}`
                }}>
                  {isQRScanEnabled(selectedEventDetails) ? '🟢 Active' : '🔒 Locked'}
                </span>
              </div>

              <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#666' }}>
                {getQRStatusMessage(selectedEventDetails)}
              </p>

              {isQRScanEnabled(selectedEventDetails) ? (
                <div>
                  {/* Scanner Controls */}
                  {!showQRScanner ? (
                    <button
                      onClick={() => navigate(`/qr-scanner/${selectedEventDetails._id}`)}
                      style={{
                        padding: '14px 30px',
                        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.05rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
                        transition: 'all 0.3s ease',
                        width: '100%'
                      }}
                    >
                      📱 Open QR Scanner
                    </button>
                  ) : (
                    <div>
                      {/* Two options: Camera & Upload */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        {/* Camera Scan Button */}
                        <div style={{
                          background: cameraActive ? '#e8f5e9' : 'white',
                          border: cameraActive ? '2px solid #4caf50' : '2px solid #e0e0e0',
                          borderRadius: '12px',
                          padding: '20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                          onClick={cameraActive ? stopCamera : startCamera}
                        >
                          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>📷</span>
                          <p style={{ margin: '0 0 5px 0', fontWeight: '700', color: '#333', fontSize: '1rem' }}>
                            {cameraActive ? 'Stop Camera' : 'Scan with Camera'}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                            {cameraActive ? 'Camera is scanning...' : 'Use device camera to scan QR'}
                          </p>
                        </div>

                        {/* Upload Photo Button */}
                        <label style={{
                          background: 'white',
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          padding: '20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'block'
                        }}>
                          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🖼️</span>
                          <p style={{ margin: '0 0 5px 0', fontWeight: '700', color: '#333', fontSize: '1rem' }}>
                            Upload from Gallery
                          </p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                            Upload a photo of the QR code
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQRImageUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>

                      {/* Camera Feed */}
                      {cameraActive && (
                        <div style={{
                          background: '#000',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          marginBottom: '15px',
                          position: 'relative'
                        }}>
                          <video
                            ref={videoRef}
                            style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'cover' }}
                            autoPlay
                            playsInline
                            muted
                          />
                          <canvas ref={canvasRef} style={{ display: 'none' }} />
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '200px',
                            height: '200px',
                            border: '3px solid rgba(76, 175, 80, 0.7)',
                            borderRadius: '15px',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)'
                          }} />
                          {scanLoading && (
                            <div style={{
                              position: 'absolute',
                              bottom: '15px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: 'rgba(0,0,0,0.7)',
                              color: '#4caf50',
                              padding: '8px 20px',
                              borderRadius: '20px',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}>
                              🔍 Scanning...
                            </div>
                          )}
                        </div>
                      )}

                      {/* Loading indicator for upload */}
                      {scanLoading && !cameraActive && (
                        <div style={{
                          textAlign: 'center',
                          padding: '20px',
                          background: '#e3f2fd',
                          borderRadius: '8px',
                          marginBottom: '15px'
                        }}>
                          <p style={{ margin: 0, color: '#1976d2', fontWeight: '600' }}>⏳ Scanning QR code...</p>
                        </div>
                      )}

                      {/* Scan Error */}
                      {scanError && (
                        <div style={{
                          background: '#ffebee',
                          border: '1px solid #f44336',
                          padding: '15px',
                          borderRadius: '8px',
                          marginBottom: '15px'
                        }}>
                          <p style={{ margin: 0, color: '#c62828', fontWeight: '600' }}>❌ {scanError}</p>
                        </div>
                      )}

                      {/* Scan Result */}
                      {scanResult && (
                        <div style={{
                          background: scanResult.verified ? '#e8f5e9' : '#ffebee',
                          border: `2px solid ${scanResult.verified ? '#4caf50' : '#f44336'}`,
                          borderRadius: '12px',
                          padding: '20px',
                          marginBottom: '15px'
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <span style={{ fontSize: '3rem' }}>{scanResult.verified ? '✅' : '❌'}</span>
                            <h3 style={{
                              margin: '10px 0 0 0',
                              color: scanResult.verified ? '#2e7d32' : '#c62828',
                              fontSize: '1.3rem'
                            }}>
                              {scanResult.message}
                            </h3>
                          </div>

                          {scanResult.verified && scanResult.participant && (
                            <div style={{
                              background: 'white',
                              borderRadius: '8px',
                              padding: '15px',
                              marginTop: '15px'
                            }}>
                              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>👤 Participant Details</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                  <p style={{ margin: '0 0 3px 0', fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>NAME</p>
                                  <p style={{ margin: 0, fontSize: '1rem', color: '#333', fontWeight: '600' }}>{scanResult.participant.name}</p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 3px 0', fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>EMAIL</p>
                                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#333' }}>{scanResult.participant.email}</p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 3px 0', fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>CONTACT</p>
                                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#333' }}>{scanResult.participant.contact}</p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 3px 0', fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>COLLEGE</p>
                                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#333' }}>{scanResult.participant.college}</p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 3px 0', fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>TYPE</p>
                                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#333' }}>{scanResult.participant.type}</p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 3px 0', fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>REGISTERED</p>
                                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#333' }}>
                                    {scanResult.participant.registeredAt ? new Date(scanResult.participant.registeredAt).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Scan Again button */}
                          <button
                            onClick={() => { setScanResult(null); setScanError(''); }}
                            style={{
                              marginTop: '15px',
                              padding: '12px 24px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '1rem',
                              width: '100%'
                            }}
                          >
                            🔄 Scan Another Ticket
                          </button>
                        </div>
                      )}

                      {/* Close Scanner */}
                      <button
                        onClick={() => { setShowQRScanner(false); stopCamera(); setScanResult(null); setScanError(''); }}
                        style={{
                          padding: '10px 20px',
                          background: '#f0f0f0',
                          color: '#666',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          width: '100%'
                        }}
                      >
                        ✕ Close Scanner
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '30px',
                  background: '#fafafa',
                  borderRadius: '8px',
                  border: '1px dashed #ccc'
                }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px', opacity: 0.5 }}>🔒</span>
                  <p style={{ margin: 0, color: '#999', fontWeight: '600' }}>
                    QR scanning is not available yet
                  </p>
                  <p style={{ margin: '5px 0 0 0', color: '#bbb', fontSize: '0.85rem' }}>
                    This feature will automatically unlock at midnight (12:01 AM) on the event day
                  </p>
                </div>
              )}
            </div>

            {/* ===== DISCUSSION FORUM SECTION ===== */}
            <div style={{
              background: '#f9f9f9',
              padding: '25px',
              borderRadius: '12px',
              marginTop: '25px',
              border: '2px solid #667eea'
            }}>
              <h3 style={{ ...sectionTitleStyle, margin: '0 0 15px 0' }}>
                💬 Discussion Forum
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#666' }}>
                Interact with participants, post announcements, and answer questions in real-time.
              </p>
              <DiscussionForum 
                eventId={selectedEventDetails._id} 
                isOrganizer={true}
              />
            </div>
          </div>
        )}

        {/* ===== ANALYTICS TAB ===== */}
        {activeTab === 'analytics' && (() => {
          // Compute analytics from all events
          const allEvents = myEvents;
          const completedEvents = allEvents.filter(e => e.status === 'Closed' || e.status === 'Completed' || e.status === 'Ongoing');
          const publishedEvents = allEvents.filter(e => e.status === 'Published');
          const draftEvents = allEvents.filter(e => e.status === 'Draft' || !e.status);

          // Overall stats
          const totalRegistrations = allEvents.reduce((sum, e) => sum + (e.participants?.length || 0), 0);
          const totalTeamRegistrations = allEvents.reduce((sum, e) => sum + (e.teamRegistrations?.length || 0), 0);
          const totalRevenue = allEvents.reduce((sum, e) => {
            const fee = e.registrationFee || 0;
            const participants = e.participants?.length || 0;
            const teamMembers = (e.teamRegistrations || []).reduce((tSum, t) => tSum + (t.members?.length || 0), 0);
            if (e.type === 'Team') return sum + (teamMembers * fee);
            return sum + (participants * fee);
          }, 0);
          const totalMerchandiseSold = allEvents.filter(e => e.type === 'Merchandise').reduce((sum, e) => sum + (e.soldCount || 0), 0);
          const avgRegistrationsPerEvent = allEvents.length > 0 ? Math.round(totalRegistrations / allEvents.length) : 0;
          const totalCapacity = allEvents.reduce((sum, e) => sum + (e.registrationLimit || 0), 0);
          const fillRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;

          return (
            <>
              <div style={welcomeBoxStyle}>
                <h1 style={{ fontSize: '2.2rem', margin: '0 0 10px 0', color: '#333' }}>📊 Event Analytics</h1>
                <p style={{ color: '#666', fontSize: '1.05rem', margin: 0 }}>
                  Comprehensive overview of all your events' performance
                </p>
              </div>

              {/* Summary Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                {/* Total Events */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '16px',
                  padding: '25px',
                  color: 'white',
                  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Events</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', margin: '8px 0' }}>{allEvents.length}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    {completedEvents.length} completed · {publishedEvents.length} active · {draftEvents.length} drafts
                  </div>
                </div>

                {/* Total Registrations */}
                <div style={{
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  borderRadius: '16px',
                  padding: '25px',
                  color: 'white',
                  boxShadow: '0 10px 30px rgba(76, 175, 80, 0.3)'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Registrations</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', margin: '8px 0' }}>{totalRegistrations}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    Avg {avgRegistrationsPerEvent} per event · {fillRate}% fill rate
                  </div>
                </div>

                {/* Total Revenue */}
                <div style={{
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  borderRadius: '16px',
                  padding: '25px',
                  color: 'white',
                  boxShadow: '0 10px 30px rgba(255, 152, 0, 0.3)'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', margin: '8px 0' }}>₹{totalRevenue.toLocaleString()}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    From all paid events & merchandise
                  </div>
                </div>

                {/* Team & Merch */}
                <div style={{
                  background: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)',
                  borderRadius: '16px',
                  padding: '25px',
                  color: 'white',
                  boxShadow: '0 10px 30px rgba(233, 30, 99, 0.3)'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Teams & Sales</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: '800', margin: '8px 0' }}>{totalTeamRegistrations}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    Teams registered · {totalMerchandiseSold} merch sold
                  </div>
                </div>
              </div>

              {/* Event Type Breakdown */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '30px',
                marginBottom: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ margin: '0 0 25px 0', color: '#333', fontSize: '1.4rem', fontWeight: '700' }}>
                  📈 Event Type Breakdown
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {['Normal', 'Team', 'Merchandise'].map(type => {
                    const typeEvents = allEvents.filter(e => e.type === type);
                    const typeRegs = typeEvents.reduce((sum, e) => sum + (e.participants?.length || 0), 0);
                    const typeRevenue = typeEvents.reduce((sum, e) => {
                      const fee = e.registrationFee || 0;
                      const parts = e.participants?.length || 0;
                      const teamMembers = (e.teamRegistrations || []).reduce((tSum, t) => tSum + (t.members?.length || 0), 0);
                      if (e.type === 'Team') return sum + (teamMembers * fee);
                      return sum + (parts * fee);
                    }, 0);
                    const icon = type === 'Normal' ? '👤' : type === 'Team' ? '👥' : '🛍️';
                    const color = type === 'Normal' ? '#2196F3' : type === 'Team' ? '#9C27B0' : '#FF9800';

                    return (
                      <div key={type} style={{
                        background: `${color}10`,
                        border: `2px solid ${color}30`,
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{icon}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#333', marginBottom: '12px' }}>{type} Events</div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
                          <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color }}>{typeEvents.length}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>EVENTS</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color }}>{typeRegs}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>REGISTRATIONS</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color }}>₹{typeRevenue.toLocaleString()}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>REVENUE</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Event Detailed Table */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '30px',
                marginBottom: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ margin: '0 0 25px 0', color: '#333', fontSize: '1.4rem', fontWeight: '700' }}>
                  📋 Per-Event Performance
                </h3>
                {allEvents.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)' }}>
                          <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Event</th>
                          <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Type</th>
                          <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Status</th>
                          <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Registrations</th>
                          <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Capacity</th>
                          <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Fill %</th>
                          <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Fee</th>
                          <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e7ff' }}>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allEvents
                          .sort((a, b) => {
                            const order = { 'Ongoing': 0, 'Published': 1, 'Closed': 2, 'Completed': 2, 'Draft': 3 };
                            return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                          })
                          .map((event, idx) => {
                            const regs = event.participants?.length || 0;
                            const cap = event.registrationLimit || 0;
                            const fill = cap > 0 ? Math.round((regs / cap) * 100) : 0;
                            const fee = event.registrationFee || 0;
                            const teamMembers = (event.teamRegistrations || []).reduce((s, t) => s + (t.members?.length || 0), 0);
                            const eventRevenue = event.type === 'Team' ? teamMembers * fee : regs * fee;
                            const fillColor = fill >= 90 ? '#f44336' : fill >= 60 ? '#FF9800' : fill >= 30 ? '#2196F3' : '#4CAF50';
                            const typeIcon = event.type === 'Normal' ? '👤' : event.type === 'Team' ? '👥' : '🛍️';

                            return (
                              <tr key={event._id} style={{
                                borderBottom: '1px solid #f0f0f0',
                                background: idx % 2 === 0 ? '#fff' : '#fafafa',
                                transition: 'background 0.2s'
                              }}>
                                <td style={{ padding: '14px 16px', fontWeight: '600', color: '#333', maxWidth: '200px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{typeIcon}</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>{event.type}</td>
                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                  <span style={getStatusBadgeStyle(event.status || 'Draft')}>{event.status || 'Draft'}</span>
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#333', fontSize: '1.05rem' }}>
                                  {regs}
                                  {event.type === 'Team' && <span style={{ fontSize: '0.75rem', color: '#9C27B0', display: 'block' }}>{event.teamRegistrations?.length || 0} teams</span>}
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'center', color: '#666' }}>{cap || '∞'}</td>
                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '60px',
                                      height: '8px',
                                      background: '#eee',
                                      borderRadius: '4px',
                                      overflow: 'hidden'
                                    }}>
                                      <div style={{
                                        width: `${Math.min(fill, 100)}%`,
                                        height: '100%',
                                        background: fillColor,
                                        borderRadius: '4px',
                                        transition: 'width 0.5s ease'
                                      }} />
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: fillColor }}>{fill}%</span>
                                  </div>
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'center', color: '#666' }}>₹{fee}</td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: eventRevenue > 0 ? '#2e7d32' : '#999', fontSize: '1.05rem' }}>
                                  ₹{eventRevenue.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)', fontWeight: '700' }}>
                          <td style={{ padding: '14px 16px', fontWeight: '800', color: '#2e7d32', fontSize: '1rem' }} colSpan={3}>TOTAL</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', color: '#2e7d32', fontSize: '1.1rem', fontWeight: '800' }}>{totalRegistrations}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', color: '#2e7d32' }}>{totalCapacity}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: fillRate >= 60 ? '#FF9800' : '#4CAF50' }}>{fillRate}%</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}></td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#2e7d32', fontSize: '1.2rem', fontWeight: '800' }}>₹{totalRevenue.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <p style={{ fontSize: '2rem', margin: '0 0 10px 0' }}>📭</p>
                    <p>No events created yet. Create events to see analytics here.</p>
                  </div>
                )}
              </div>

              {/* Status Distribution Visual */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ margin: '0 0 25px 0', color: '#333', fontSize: '1.4rem', fontWeight: '700' }}>
                  🎯 Status Distribution
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  {[
                    { status: 'Draft', icon: '📝', color: '#9e9e9e', bg: '#f5f5f5' },
                    { status: 'Published', icon: '🟢', color: '#2196F3', bg: '#e3f2fd' },
                    { status: 'Ongoing', icon: '🔴', color: '#4CAF50', bg: '#e8f5e9' },
                    { status: 'Closed', icon: '🏁', color: '#f44336', bg: '#ffebee' }
                  ].map(({ status, icon, color, bg }) => {
                    const count = allEvents.filter(e => (e.status || 'Draft') === status).length;
                    const pct = allEvents.length > 0 ? Math.round((count / allEvents.length) * 100) : 0;
                    return (
                      <div key={status} style={{
                        background: bg,
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center',
                        border: `2px solid ${color}20`
                      }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{icon}</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color }}>{count}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#555', marginTop: '4px' }}>{status}</div>
                        <div style={{
                          marginTop: '10px',
                          height: '6px',
                          background: '#e0e0e0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: color,
                            borderRadius: '3px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '5px' }}>{pct}% of all events</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* ===== PROFILE SETTINGS TAB ===== */}
        {activeTab === 'profile' && (
          <>
            <div style={welcomeBoxStyle}>
              <h1 style={{ fontSize: '2.2rem', margin: '0 0 10px 0', color: '#333' }}>⚙️ Profile Settings</h1>
              <p style={{ color: '#666', fontSize: '1.05rem', margin: 0 }}>
                Manage your club information and Discord integration
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '1.5rem', fontWeight: '700' }}>
                  🏢 Club Information
                </h3>
                {!isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      style={{
                        padding: '10px 24px',
                        background: '#e0e0e0',
                        color: '#666',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      style={{
                        padding: '10px 24px',
                        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)'
                      }}
                    >
                      💾 Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '25px' }}>
                {/* Club Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                    Club Name
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.organizerName}
                      onChange={(e) => setProfileData({ ...profileData, organizerName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'border 0.3s ease'
                      }}
                      placeholder="Enter club name"
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#333', fontWeight: '600' }}>
                      {profileData.organizerName || 'Not set'}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                    Category
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.category}
                      onChange={(e) => setProfileData({ ...profileData, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                      placeholder="e.g., Cultural, Technical, Sports"
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
                      {profileData.category || 'Not set'}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                    Description
                  </label>
                  {isEditingProfile ? (
                    <textarea
                      value={profileData.description}
                      onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        minHeight: '120px',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                      placeholder="Tell participants about your club"
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '1rem', color: '#666', lineHeight: '1.6' }}>
                      {profileData.description || 'No description provided'}
                    </p>
                  )}
                </div>

                {/* Contact Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                    Contact Number
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="tel"
                      value={profileData.contactNumber}
                      onChange={(e) => setProfileData({ ...profileData, contactNumber: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                      placeholder="+91 9876543210"
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
                      {profileData.contactNumber || 'Not set'}
                    </p>
                  )}
                </div>

                {/* Contact Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                    Contact Email
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="email"
                      value={profileData.contactEmail}
                      onChange={(e) => setProfileData({ ...profileData, contactEmail: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                      placeholder="contact@club.com"
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
                      {profileData.contactEmail || 'Not set'}
                    </p>
                  )}
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#999' }}>
                    📧 This email will be shown to participants for queries
                  </p>
                </div>

                {/* Login Email (Non-editable) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                    Login Email <span style={{ fontSize: '0.75rem', color: '#f44336' }}>(Non-editable)</span>
                  </label>
                  <p style={{ margin: 0, fontSize: '1.1rem', color: '#333', background: '#f5f5f5', padding: '12px 16px', borderRadius: '8px' }}>
                    {user?.email || 'Not available'}
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#999' }}>
                    🔒 Contact admin to change login credentials
                  </p>
                </div>

                {/* Discord Webhook */}
                <div style={{
                  background: '#f0f4ff',
                  border: '2px solid #90caf9',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔔</span>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '1.2rem', fontWeight: '700' }}>
                      Discord Integration
                    </h4>
                  </div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                    Discord Webhook URL
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="url"
                      value={profileData.discordWebhook}
                      onChange={(e) => setProfileData({ ...profileData, discordWebhook: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #90caf9',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontFamily: 'monospace',
                        outline: 'none'
                      }}
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                  ) : (
                    <p style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      color: profileData.discordWebhook ? '#333' : '#999',
                      fontFamily: profileData.discordWebhook ? 'monospace' : 'inherit',
                      wordBreak: 'break-all',
                      background: 'white',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      {profileData.discordWebhook || 'Not configured'}
                    </p>
                  )}
                  <div style={{
                    marginTop: '12px',
                    padding: '15px',
                    background: 'white',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#666',
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#667eea' }}>
                      💡 How to get a Discord Webhook URL:
                    </p>
                    <ol style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>Go to your Discord server</li>
                      <li>Open <strong>Server Settings → Integrations → Webhooks</strong></li>
                      <li>Click <strong>New Webhook</strong></li>
                      <li>Give it a name (e.g., "Event Notifications")</li>
                      <li>Select the channel where events should be posted</li>
                      <li>Copy the <strong>Webhook URL</strong> and paste it here</li>
                    </ol>
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#f57c00', fontWeight: '600' }}>
                      ⚠️ When published, events will auto-post to your Discord server!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

// --- STYLES ---
const containerStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', padding: '20px' };
const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px' };
const navBrandStyle = { display: 'flex', alignItems: 'center', gap: '10px' };
const navIconStyle = { fontSize: '1.5rem' };
const navTitleStyle = { margin: 0, fontSize: '1.5rem' };
const navMenuStyle = { display: 'flex', gap: '10px', flex: 1, justifyContent: 'center' };
const navButtonStyle = { padding: '10px 20px', background: 'transparent', color: '#666', border: '2px solid transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'all 0.3s ease' };
const activeNavButtonStyle = { padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: '2px solid transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' };
const logoutButtonStyle = { padding: '10px 20px', background: '#f5576c', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: '600' };
const contentStyle = { maxWidth: '1200px', margin: '0 auto' };
const welcomeBoxStyle = { background: 'white', padding: '30px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' };
const profileCardStyle = { background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' };
const profileHeaderStyle = { borderBottom: '1px solid #eee', paddingBottom: '10px' };
const tableStyle = { width: '100%', textAlign: 'left', borderCollapse: 'collapse' };
const eventSectionStyle = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' };
const eventHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const createEventButtonStyle = { padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)' };
const eventListGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' };
const eventItemCardStyle = { background: '#fff', border: '2px solid #eee', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' } };

// Form Styles
const formBoxStyle = { background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', maxWidth: '900px', margin: '0 auto' };
const formTitleStyle = { marginBottom: '30px', color: '#333', textAlign: 'center', fontSize: '1.8rem' };
const gridFormStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' };
const inputStyle = { padding: '12px', border: '2px solid #eee', borderRadius: '8px', fontSize: '1rem', transition: 'border 0.3s ease' };
const dateGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '0.9rem', fontWeight: '600', color: '#666' };
const draftButtonStyle = { gridColumn: 'span 1', padding: '15px', background: 'linear-gradient(135deg, #757575 0%, #9e9e9e 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(117, 117, 117, 0.4)' };
const submitButtonStyle = { gridColumn: 'span 1', padding: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' };
const infoBoxStyle = { background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #90caf9' };
const addButtonStyle = { padding: '8px 16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.3s ease' };
const removeButtonStyle = { padding: '6px 12px', background: '#f5576c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.3s ease' };

// Details View Styles
const detailsContainerStyle = { background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' };
const backButtonStyle = { padding: '10px 20px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s ease' };
const publishDraftButtonStyle = { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' };
const detailsHeaderStyle = { borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' };
const detailsCardStyle = { background: '#f9f9f9', padding: '25px', borderRadius: '12px', marginBottom: '25px' };
const sectionTitleStyle = { margin: '0 0 20px 0', color: '#333', fontSize: '1.3rem', fontWeight: '700' };
const infoGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' };
const infoItemStyle = { display: 'flex', flexDirection: 'column', gap: '5px' };
const infoLabelStyle = { fontSize: '0.85rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' };
const infoValueStyle = { fontSize: '1rem', color: '#333', fontWeight: '600' };
const participantsCardStyle = { background: '#f9f9f9', padding: '25px', borderRadius: '12px' };
const participantTableStyle = { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' };
const tableHeaderStyle = { padding: '15px', textAlign: 'left', fontWeight: '700', color: '#333', fontSize: '0.95rem' };
const tableCellStyle = { padding: '12px 15px', color: '#555', fontSize: '0.9rem' };

// Edit Panel Styles
const editLabelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' };
const editInputStyle = { width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '1rem', transition: 'border 0.3s ease', background: 'white', boxSizing: 'border-box' };
const disabledInputStyle = { background: '#f5f5f5', color: '#999', cursor: 'not-allowed', border: '2px solid #eee' };

export default OrganizerDashboard;