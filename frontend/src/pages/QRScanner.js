import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import jsQR from 'jsqr';

const QRScanner = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [event, setEvent] = useState(null);
  const [scanMode, setScanMode] = useState('camera'); // camera, file, manual
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendedList, setAttendedList] = useState([]);
  const [notAttendedList, setNotAttendedList] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [recentScans, setRecentScans] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'Organizer') {
      navigate('/login');
      return;
    }
    fetchEventDetails();
    fetchAttendanceDashboard();
  }, [eventId, user]);

  const fetchEventDetails = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`http://localhost:5000/api/events/${eventId}`, config);
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      alert('Error loading event details');
    }
  };

  const fetchAttendanceDashboard = async () => {
    try {
      console.log('Fetching attendance dashboard for event:', eventId);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`http://localhost:5000/api/attendance/event/${eventId}`, config);
      
      console.log('Attendance data received:', {
        totalRegistered: data.totalRegistered,
        totalScanned: data.totalScanned,
        totalNotScanned: data.totalNotScanned,
        attendancePercentage: data.attendancePercentage
      });
      
      // Map the response from new controller format
      const stats = {
        totalRegistered: data.totalRegistered,
        totalAttended: data.totalScanned,
        totalNotAttended: data.totalNotScanned,
        attendanceRate: data.attendancePercentage,
        lastScanTime: data.scannedParticipants.length > 0 ? data.scannedParticipants[0].scannedAt : null
      };
      
      console.log('Setting attendance stats:', stats);
      setAttendanceStats(stats);
      setAttendedList(data.scannedParticipants);
      setNotAttendedList(data.notScannedParticipants);
      setRecentScans(data.attendanceLog.slice(-10).reverse());
    } catch (error) {
      console.error('Error fetching attendance dashboard:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  };

  // Camera Scanning Functions
  const startCameraScanning = async () => {
    try {
      console.log('Starting camera...');
      
      // Stop any existing stream first
      stopCameraScanning();
      
      // Set scanning state first to show UI
      setScanning(true);
      
      // Small delay to ensure video element is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });

      console.log('Camera access granted, stream:', stream);
      console.log('Stream active:', stream.active);
      console.log('Stream tracks:', stream.getTracks());
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('Setting video srcObject...');
        videoRef.current.srcObject = stream;
        
        // Force video attributes
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('muted', '');
        
        // Multiple attempts to play
        const attemptPlay = async (attempt = 1) => {
          try {
            console.log(`Play attempt ${attempt}...`);
            await videoRef.current.play();
            console.log('Video playing! VideoWidth:', videoRef.current.videoWidth, 'VideoHeight:', videoRef.current.videoHeight);
            
            // Start QR scanning after successful play
            setTimeout(() => {
              if (videoRef.current && videoRef.current.videoWidth > 0) {
                scanIntervalRef.current = setInterval(scanQRFromVideo, 500);
                console.log('QR scanning interval started');
              } else {
                console.warn('Video dimensions still 0, retrying...');
                if (attempt < 3) {
                  setTimeout(() => attemptPlay(attempt + 1), 1000);
                }
              }
            }, 500);
            
          } catch (err) {
            console.error(`Play attempt ${attempt} failed:`, err);
            if (attempt < 3) {
              setTimeout(() => attemptPlay(attempt + 1), 500);
            } else {
              alert('Unable to start video playback. The camera is active but video display failed.');
            }
          }
        };
        
        // Start play attempts
        attemptPlay();
      }
      
    } catch (error) {
      console.error('Camera access error:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('❌ Camera permission denied. Please allow camera access in your browser settings and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        alert('❌ No camera found on this device. Please try file upload instead.');
      } else if (error.name === 'NotReadableError') {
        alert('❌ Camera is already in use by another application. Please close other apps using the camera.');
      } else {
        alert('❌ Unable to access camera: ' + error.message + '. Please try file upload instead.');
      }
      
      setScanning(false);
    }
  };

  const stopCameraScanning = () => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped camera track:', track.label);
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Clear scan interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setScanning(false);
    console.log('Camera scanning stopped');
  };

  const scanQRFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('Video or canvas ref not available');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (canvas.width === 0 || canvas.height === 0) {
          console.log('Video dimensions not ready yet');
          return;
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          console.log('QR Code detected:', code.data);
          handleScan(code.data, 'Camera');
        }
      } catch (error) {
        console.error('Error scanning QR from video:', error);
      }
    } else {
      // Video not ready yet, just skip this frame
    }
  };

  const handleScan = async (qrData, scanMethod) => {
    if (!qrData) return;

    try {
      // Parse QR code data (it might be JSON or just a string)
      let ticketId = qrData;
      let parsedData = null;
      
      // Try to parse as JSON
      if (typeof qrData === 'string' && (qrData.startsWith('{') || qrData.startsWith('['))) {
        try {
          parsedData = JSON.parse(qrData);
          ticketId = parsedData.ticketId || qrData;
          console.log('Parsed QR data:', parsedData);
        } catch (e) {
          console.log('QR data is not JSON, using as-is');
        }
      }

      // Prevent duplicate rapid scans
      if (lastScan && lastScan.ticketId === ticketId && (Date.now() - lastScan.time < 3000)) {
        console.log('Duplicate scan prevented (within 3 seconds)');
        return;
      }

      console.log('Sending scan request with ticketId:', ticketId, 'eventId:', eventId);

      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(
        'http://localhost:5000/api/attendance/scan',
        { ticketId, eventId, scanMethod },
        config
      );

      console.log('Scan successful! Response:', data);
      
      setLastScan({
        ticketId,
        time: Date.now(),
        success: true,
        message: `✅ ${data.participant.name} - Attendance marked!`,
        participant: data.participant
      });

      // Play success sound
      playBeep(true);

      // Refresh dashboard immediately
      console.log('Refreshing attendance dashboard...');
      await fetchAttendanceDashboard();

    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error scanning ticket';
      const isDuplicate = error.response?.data?.alreadyScanned;

      setLastScan({
        ticketId: typeof qrData === 'string' ? qrData : JSON.stringify(qrData),
        time: Date.now(),
        success: false,
        message: isDuplicate ? `⚠️ Already Scanned: ${errorMsg}` : `❌ ${errorMsg}`,
        participant: error.response?.data?.participant
      });

      // Play error sound
      playBeep(false);
      
      console.error('Scan error:', error.response?.data || error.message);
    }
  };

  const playBeep = (success) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = success ? 800 : 400;
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  // File Upload Scanning
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('qrImage', file);
    formData.append('eventId', eventId);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      };
      const { data } = await axios.post(
        'http://localhost:5000/api/attendance/scan-file',
        formData,
        config
      );

      setLastScan({
        ticketId: data.participant.ticketId,
        time: Date.now(),
        success: true,
        message: `✅ ${data.participant.name} - Attendance marked via file!`,
        participant: data.participant
      });

      playBeep(true);
      setTimeout(() => fetchAttendanceDashboard(), 500);

    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error scanning file';
      setLastScan({
        ticketId: 'file-upload',
        time: Date.now(),
        success: false,
        message: `❌ ${errorMsg}`
      });
      playBeep(false);
    }

    e.target.value = '';
  };

  // Manual Override
  const handleManualOverride = async () => {
    if (!manualEmail.trim() || !manualReason.trim()) {
      alert('Please enter participant email and reason');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      // Find user ID from email
      const participant = notAttendedList.find(p => p.email === manualEmail);
      if (!participant) {
        alert('Participant not found or already marked present');
        return;
      }

      const { data } = await axios.post(
        'http://localhost:5000/api/attendance/manual',
        { 
          userId: participant._id, 
          eventId, 
          action: 'mark',
          reason: manualReason 
        },
        config
      );

      alert(`✅ ${data.message}`);
      setManualEmail('');
      setManualReason('');
      fetchAttendanceDashboard();

    } catch (error) {
      alert(error.response?.data?.message || 'Error marking manual attendance');
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob'
      };
      const { data } = await axios.get(
        `http://localhost:5000/api/attendance/export/${eventId}`,
        config
      );

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${event?.name || 'event'}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      alert('Error exporting attendance report');
    }
  };

  useEffect(() => {
    return () => {
      stopCameraScanning();
    };
  }, []);

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const headerStyle = {
    backgroundColor: '#fff',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  };

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    margin: '5px'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#667eea',
    color: '#fff'
  };

  const successButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#4caf50',
    color: '#fff'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f44336',
    color: '#fff'
  };

  const statsCardStyle = {
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center',
    margin: '10px'
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
      
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>📱 QR Scanner</h1>
            <h3 style={{ margin: 0, color: '#666', fontWeight: 'normal' }}>
              {event?.name || 'Loading...'}
            </h3>
          </div>
          <div>
            <button onClick={() => navigate('/organizer-dashboard')} style={primaryButtonStyle}>
              ← Back to Dashboard
            </button>
            <button onClick={handleExportCSV} style={successButtonStyle}>
              📥 Export CSV
            </button>
            <button onClick={() => setShowDashboard(!showDashboard)} style={primaryButtonStyle}>
              {showDashboard ? '📱 Show Scanner' : '📊 Show Dashboard'}
            </button>
          </div>
        </div>
      </div>

      {!showDashboard ? (
        <>
          {/* Stats Overview */}
          {attendanceStats && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>📊 Quick Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={statsCardStyle}>
                  <div style={{ fontSize: '2.5rem', color: '#667eea', marginBottom: '10px' }}>
                    {attendanceStats.totalRegistered}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Registered</div>
                </div>
                <div style={statsCardStyle}>
                  <div style={{ fontSize: '2.5rem', color: '#4caf50', marginBottom: '10px' }}>
                    {attendanceStats.totalAttended}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Attended</div>
                </div>
                <div style={statsCardStyle}>
                  <div style={{ fontSize: '2.5rem', color: '#f44336', marginBottom: '10px' }}>
                    {attendanceStats.totalNotAttended}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Not Attended</div>
                </div>
                <div style={statsCardStyle}>
                  <div style={{ fontSize: '2.5rem', color: '#ff9800', marginBottom: '10px' }}>
                    {attendanceStats.attendanceRate}%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Attendance Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Scan Mode Selector */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Scan Method</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setScanMode('camera')}
                style={{
                  ...buttonStyle,
                  backgroundColor: scanMode === 'camera' ? '#667eea' : '#e0e0e0',
                  color: scanMode === 'camera' ? '#fff' : '#333'
                }}
              >
                📸 Camera Scan
              </button>
              <button
                onClick={() => setScanMode('file')}
                style={{
                  ...buttonStyle,
                  backgroundColor: scanMode === 'file' ? '#667eea' : '#e0e0e0',
                  color: scanMode === 'file' ? '#fff' : '#333'
                }}
              >
                📁 File Upload
              </button>
              <button
                onClick={() => setScanMode('manual')}
                style={{
                  ...buttonStyle,
                  backgroundColor: scanMode === 'manual' ? '#667eea' : '#e0e0e0',
                  color: scanMode === 'manual' ? '#fff' : '#333'
                }}
              >
                ✍️ Manual Entry
              </button>
            </div>
          </div>

          {/* Camera Scanning */}
          {scanMode === 'camera' && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>📸 Camera Scanner</h3>
              <div style={{ textAlign: 'center' }}>
                {!scanning ? (
                  <button onClick={startCameraScanning} style={successButtonStyle}>
                    🎥 Start Camera
                  </button>
                ) : (
                  <button onClick={stopCameraScanning} style={dangerButtonStyle}>
                    ⏹️ Stop Camera
                  </button>
                )}
              </div>

              {scanning && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ 
                    background: '#4caf50', 
                    color: 'white', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    marginBottom: '15px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    animation: 'pulse 2s infinite'
                  }}>
                    📡 Camera Active - Point at QR Code
                  </div>
                  
                  {/* Debug Info */}
                  <div style={{
                    background: '#f0f0f0',
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    fontSize: '0.85rem',
                    textAlign: 'center'
                  }}>
                    Status: {videoRef.current?.readyState === 4 ? '✅ Video Ready' : '⏳ Loading...'} | 
                    Dimensions: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      controls={false}
                      style={{
                        width: '100%',
                        maxWidth: '640px',
                        minHeight: '480px',
                        borderRadius: '10px',
                        display: 'block',
                        margin: '0 auto',
                        backgroundColor: '#222',
                        objectFit: 'contain'
                      }}
                    >
                      Your browser does not support video
                    </video>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      border: '3px solid #4caf50',
                      width: '250px',
                      height: '250px',
                      borderRadius: '10px',
                      pointerEvents: 'none',
                      boxShadow: '0 0 0 2000px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Upload */}
          {scanMode === 'file' && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>📁 Upload QR Code Image</h3>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{
                  padding: '15px',
                  border: '2px dashed #667eea',
                  borderRadius: '10px',
                  width: '100%',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              />
              <p style={{ marginTop: '15px', color: '#666', fontSize: '0.9rem' }}>
                📌 Tip: Take a clear photo of the QR code and upload it here
              </p>
            </div>
          )}

          {/* Manual Entry */}
          {scanMode === 'manual' && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>✍️ Manual Attendance Override</h3>
              <div style={{ maxWidth: '600px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Participant Email:
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="participant@example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '15px',
                    fontSize: '1rem'
                  }}
                />

                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Reason for Manual Entry:
                </label>
                <textarea
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g., QR code not working, lost ticket, etc."
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '15px',
                    fontSize: '1rem',
                    fontFamily: 'inherit'
                  }}
                />

                <button onClick={handleManualOverride} style={successButtonStyle}>
                  ✅ Mark Attendance
                </button>

                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  color: '#856404'
                }}>
                  <strong>⚠️ Note:</strong> Manual entries are logged for audit purposes.
                </div>
              </div>
            </div>
          )}

          {/* Last Scan Result */}
          {lastScan && (
            <div style={{
              ...cardStyle,
              backgroundColor: lastScan.success ? '#d4edda' : '#f8d7da',
              border: `2px solid ${lastScan.success ? '#4caf50' : '#f44336'}`
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                {lastScan.message}
              </div>
              {lastScan.participant && (
                <div style={{ fontSize: '0.9rem', color: '#555' }}>
                  <strong>Email:</strong> {lastScan.participant.email || lastScan.participant.participantEmail}<br />
                  <strong>Time:</strong> {new Date(lastScan.time).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Recent Scans */}
          {recentScans && recentScans.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>🕒 Recent Scans</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {recentScans.map((scan, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    borderLeft: `4px solid ${scan.isManualOverride ? '#ff9800' : '#4caf50'}`
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>
                      {scan.participantName}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {scan.participantEmail} • {new Date(scan.scannedAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '5px' }}>
                      Method: {scan.scanMethod}
                      {scan.isManualOverride && ` • Override: ${scan.overrideReason}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Dashboard View */
        <div>
          {/* Attended List */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px 0', color: '#4caf50' }}>✅ Attended ({attendedList.length})</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {attendedList.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center' }}>No one has checked in yet</p>
              ) : (
                attendedList.map((participant) => (
                  <div key={participant.id} style={{
                    padding: '15px',
                    backgroundColor: '#f1f8f4',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>{participant.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{participant.email}</div>
                      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
                        {new Date(participant.attendedAt).toLocaleString()}
                        {participant.manualOverride && <span style={{ color: '#ff9800' }}> • Manual Override</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.5rem' }}>✅</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Not Attended List */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f44336' }}>⏳ Not Attended ({notAttendedList.length})</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notAttendedList.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center' }}>Everyone has checked in! 🎉</p>
              ) : (
                notAttendedList.map((participant) => (
                  <div key={participant.id} style={{
                    padding: '15px',
                    backgroundColor: '#fff3e0',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>{participant.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{participant.email}</div>
                    </div>
                    <div style={{ fontSize: '1.5rem' }}>⏳</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
