import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';


const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]); // State for password requests
  const [allEvents, setAllEvents] = useState([]); // State for all events
  const [selectedOrganizer, setSelectedOrganizer] = useState(null); // For viewing specific organizer's events
  const [formData, setFormData] = useState({
    organizerName: '',
    // email is auto-generated
    manualPassword: '',
    description: '',
    contactNumber: ''
  });
  const [useManualPassword, setUseManualPassword] = useState(false);

  // Modal states for credentials display
  const [newCredentials, setNewCredentials] = useState(null);
  const [resetCredentials, setResetCredentials] = useState(null);

  // Security monitoring state
  const [securityEvents, setSecurityEvents] = useState([]);
  const [securityStats, setSecurityStats] = useState(null);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityPage, setSecurityPage] = useState(1);
  const [securityPagination, setSecurityPagination] = useState(null);
  const [securityFilter, setSecurityFilter] = useState({ eventType: '', ipAddress: '', email: '' });
  const [blockIPForm, setBlockIPForm] = useState({ ipAddress: '', reason: '', duration: 24 });
  const [showSecuritySection, setShowSecuritySection] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchOrganizers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/organizers`, config);
      setOrganizers(data);
    } catch (err) {
      console.error("Error fetching organizers", err);
    }
  };

  const fetchAllEvents = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/all-events`, config);
      setAllEvents(data);
    } catch (err) {
      console.error("Error fetching all events", err);
    }
  };

  // Logic to fetch users with status 'Pending'
  const fetchResetRequests = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/reset-requests`, config);
      setResetRequests(data);
    } catch (err) {
      console.error("Error fetching reset requests", err);
    }
  };

  // Security fetch functions
  const fetchSecurityEvents = async (page = 1) => {
    setSecurityLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const params = { page, limit: 20 };
      if (securityFilter.eventType) params.eventType = securityFilter.eventType;
      if (securityFilter.ipAddress) params.ipAddress = securityFilter.ipAddress;
      if (securityFilter.email) params.email = securityFilter.email;

      const { data } = await axios.get(`${API_BASE_URL}/api/security/events`, { ...config, params });
      setSecurityEvents(data.events);
      setSecurityPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching security events:', err);
    } finally {
      setSecurityLoading(false);
    }
  };

  const fetchSecurityStats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_BASE_URL}/api/security/stats`, config);
      setSecurityStats(data);
    } catch (err) {
      console.error('Error fetching security stats:', err);
    }
  };

  const fetchBlockedIPs = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_BASE_URL}/api/security/blocked-ips`, config);
      setBlockedIPs(data);
    } catch (err) {
      console.error('Error fetching blocked IPs:', err);
    }
  };

  const handleBlockIP = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${API_BASE_URL}/api/security/block-ip`, blockIPForm, config);
      alert(`✅ IP ${blockIPForm.ipAddress} blocked!`);
      setBlockIPForm({ ipAddress: '', reason: '', duration: 24 });
      fetchBlockedIPs();
      fetchSecurityStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Error blocking IP');
    }
  };

  const handleUnblockIP = async (ip) => {
    if (window.confirm(`Unblock IP ${ip}?`)) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`${API_BASE_URL}/api/security/unblock-ip/${ip}`, config);
        alert(`✅ IP ${ip} unblocked!`);
        fetchBlockedIPs();
        fetchSecurityStats();
      } catch (err) {
        alert(err.response?.data?.message || 'Error unblocking IP');
      }
    }
  };

  const loadSecurityData = () => {
    setShowSecuritySection(true);
    fetchSecurityEvents(1);
    fetchSecurityStats();
    fetchBlockedIPs();
  };

  useEffect(() => {
    if (user && user.token) {
      fetchOrganizers();
      fetchResetRequests();
      fetchAllEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  const handleResetAction = async (userId, action) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${API_BASE_URL}/api/admin/handle-reset`, { userId, action }, config);

      if (action === 'approve' && data.generatedPassword) {
        setResetCredentials({
          clubName: data.clubName,
          email: data.email,
          password: data.generatedPassword
        });
      } else {
        alert(`Request ${action}ed!`);
      }

      fetchResetRequests();
      fetchOrganizers();
    } catch (err) {
      alert("Error processing reset request");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      const payload = {
        organizerName: formData.organizerName,
        category: formData.category,
        description: formData.description,
        orgContactNumber: formData.contactNumber,
        manualPassword: useManualPassword ? formData.manualPassword : null
      };

      const { data } = await axios.post(`${API_BASE_URL}/api/admin/create-organizer`, payload, config);

      // Show credentials modal
      setNewCredentials({
        name: data.organizer.name,
        email: data.organizer.email,
        password: data.organizer.password
      });

      setFormData({
        organizerName: '',
        manualPassword: '',
        category: '',
        description: '',
        contactNumber: ''
      });
      fetchOrganizers();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating organizer");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this club? All their events will also be deleted.")) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`${API_BASE_URL}/api/admin/organizer/${id}`, config);
        alert("✅ Club removed successfully");
        fetchOrganizers();
        fetchAllEvents(); // Refresh events list
      } catch (err) {
        alert("Error deleting organizer");
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`${API_BASE_URL}/api/admin/event/${eventId}`, config);
        alert("✅ Event deleted successfully");
        fetchAllEvents();
      } catch (err) {
        alert("Error deleting event: " + (err.response?.data?.message || "Unknown error"));
      }
    }
  };

  const getOrganizerEvents = (organizerId) => {
    return allEvents.filter(event => event.organizer && event.organizer._id === organizerId);
  };

  return (
    <div style={containerStyle}>
      {/* Navigation Bar */}
      <nav style={navStyle}>
        <div style={navBrandStyle}>
          <span style={navIconStyle}>👨‍💼</span>
          <h2 style={navTitleStyle}>Admin Control Panel</h2>
        </div>
        <button onClick={handleLogout} style={logoutButtonStyle}>
          Logout
        </button>
      </nav>

      {/* Main Content */}
      <div style={contentStyle}>
        {/* SECTION 11.2: Add New Club/Organizer */}
        <section style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>➕</span>
            Provision New Club Account
          </h3>
          <form onSubmit={handleSubmit} style={formStyle}>
            <input
              type="text"
              placeholder="Club Name (e.g. ArtSoc)"
              value={formData.organizerName}
              onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
              required
              style={inputStyle}
            />

            <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '8px', fontSize: '0.9rem' }}>
              <strong>Generated Email: </strong>
              <span style={{ fontFamily: 'monospace', color: '#667eea' }}>
                {formData.organizerName ? `${formData.organizerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@clubs.iiit.ac.in` : '(enters automatically)'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                id="manualPass"
                checked={useManualPassword}
                onChange={(e) => setUseManualPassword(e.target.checked)}
              />
              <label htmlFor="manualPass">Set Password Manually</label>
            </div>

            {useManualPassword ? (
              <input
                type="text" // Visible text so admin can see what they type to share verbally
                placeholder="Enter Password"
                value={formData.manualPassword}
                onChange={(e) => setFormData({ ...formData, manualPassword: e.target.value })}
                required
                style={inputStyle}
              />
            ) : (
              <div style={{ padding: '10px', background: '#e8f5e9', borderRadius: '8px', fontSize: '0.9rem', color: '#2e7d32' }}>
                🔒 A secure random password will be generated.
              </div>
            )}
            <input
              type="text"
              placeholder="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Contact Number (optional)"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              style={inputStyle}
            />
            <textarea
              style={{ ...textareaStyle, gridColumn: 'span 2' }}
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div style={{ gridColumn: 'span 2', fontSize: '0.85rem', color: '#666', marginTop: '-10px', marginBottom: '10px' }}>
              💡 <strong>Discord Webhook:</strong> Events are automatically posted to the campus Discord server using a fixed system URL. No manual setup required for individual clubs.
            </div>
            <button type="submit" style={{ ...submitButtonStyle, gridColumn: 'span 2' }}>
              ✅ Create Account
            </button>
          </form>
        </section>

        {/* SECTION 11.2: Password Reset Requests */}
        <section style={{ ...sectionStyle, borderColor: '#ff9800' }}>
          <h3 style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>🔑</span>
            Pending Password Reset Requests
          </h3>
          {resetRequests.length > 0 ? (
            <div style={requestListStyle}>
              {resetRequests.map(req => (
                <div key={req._id} style={requestItemStyle}>
                  <div style={requestInfoStyle}>
                    <strong>{req.organizerName}</strong> ({req.email}) requests a password reset.
                  </div>
                  <div style={requestActionsStyle}>
                    <button
                      onClick={() => handleResetAction(req._id, 'approve')}
                      style={approveButtonStyle}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleResetAction(req._id, 'reject')}
                      style={rejectButtonStyle}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={emptyMessageStyle}>No pending reset requests.</p>
          )}
        </section>

        {/* SECTION 11.2: Remove Club/Organizer */}
        <section style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>🏢</span>
            Registered Clubs & Organizers
          </h3>
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={tableHeaderStyle}>Name</th>
                  <th style={tableHeaderStyle}>Email</th>
                  <th style={tableHeaderStyle}>Category</th>
                  <th style={tableHeaderStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizers.map((org) => (
                  <tr key={org._id} style={tableRowStyle}>
                    <td style={tableCellStyle}>{org.organizerName}</td>
                    <td style={tableCellStyle}>{org.email}</td>
                    <td style={tableCellStyle}>{org.category}</td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => setSelectedOrganizer(org)}
                        style={{ ...viewEventsButtonStyle, marginRight: '10px' }}
                      >
                        📅 View Events
                      </button>
                      <button
                        onClick={() => handleDelete(org._id)}
                        style={deleteButtonStyle}
                      >
                        🗑️ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION: View Events for Selected Organizer */}
        {selectedOrganizer && (
          <section style={{ ...sectionStyle, borderColor: '#9c27b0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={sectionHeaderStyle}>
                <span style={sectionIconStyle}>📅</span>
                Events by {selectedOrganizer.organizerName}
              </h3>
              <button
                onClick={() => setSelectedOrganizer(null)}
                style={{ ...deleteButtonStyle, background: '#666' }}
              >
                ✕ Close
              </button>
            </div>
            {getOrganizerEvents(selectedOrganizer._id).length > 0 ? (
              <div style={eventsGridStyle}>
                {getOrganizerEvents(selectedOrganizer._id).map(event => (
                  <div key={event._id} style={eventCardStyle}>
                    <div style={eventCardHeaderStyle}>
                      <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{event.name}</h4>
                      <span style={eventTypeStyle}>{event.type}</span>
                    </div>
                    <p style={eventDescStyle}>{event.description?.substring(0, 100)}...</p>
                    <div style={eventMetaStyle}>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        📅 {event.eventSessions && event.eventSessions[0]
                          ? new Date(event.eventSessions[0].startDate).toLocaleDateString()
                          : new Date(event.startDate).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        👥 {event.participants?.length || 0} registered
                      </div>
                      {event.type === 'Team' && (
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          🏆 {event.teamRegistrations?.length || 0} teams
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event._id)}
                      style={eventDeleteButtonStyle}
                    >
                      🗑️ Delete Event
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={emptyMessageStyle}>No events published by this club yet.</p>
            )}
          </section>
        )}

        {/* SECTION: All Events Overview */}
        <section style={{ ...sectionStyle, borderColor: '#4caf50' }}>
          <h3 style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>📊</span>
            All Published Events ({allEvents.length})
          </h3>
          {allEvents.length > 0 ? (
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderRowStyle}>
                    <th style={tableHeaderStyle}>Event Name</th>
                    <th style={tableHeaderStyle}>Organizer</th>
                    <th style={tableHeaderStyle}>Type</th>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Registrations</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.map(event => (
                    <tr key={event._id} style={tableRowStyle}>
                      <td style={tableCellStyle}>{event.name}</td>
                      <td style={tableCellStyle}>{event.organizer?.organizerName || 'Unknown'}</td>
                      <td style={tableCellStyle}>
                        <span style={eventTypeBadgeStyle}>{event.type}</span>
                      </td>
                      <td style={tableCellStyle}>
                        {event.eventSessions && event.eventSessions[0]
                          ? new Date(event.eventSessions[0].startDate).toLocaleDateString()
                          : new Date(event.startDate).toLocaleDateString()}
                      </td>
                      <td style={tableCellStyle}>
                        {event.type === 'Team'
                          ? `${event.teamRegistrations?.length || 0} teams`
                          : `${event.participants?.length || 0} participants`}
                      </td>
                      <td style={tableCellStyle}>
                        <button
                          onClick={() => handleDeleteEvent(event._id)}
                          style={deleteButtonStyle}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={emptyMessageStyle}>No events published yet.</p>
          )}
        </section>

        {/* SECTION: Security Monitoring */}
        <section style={{ ...sectionStyle, borderColor: '#f44336' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={sectionHeaderStyle}>
              <span style={sectionIconStyle}>🛡️</span>
              Bot Protection & Security Monitor
            </h3>
            {!showSecuritySection ? (
              <button onClick={loadSecurityData} style={{ ...viewEventsButtonStyle, background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)' }}>
                🔍 Load Security Data
              </button>
            ) : (
              <button onClick={loadSecurityData} style={{ ...viewEventsButtonStyle, background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)' }}>
                🔄 Refresh
              </button>
            )}
          </div>

          {showSecuritySection && (
            <>
              {/* Statistics Cards */}
              {securityStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                  <div style={statCardStyle('#f44336')}>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{securityStats.overview.total24h}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Events (24h)</div>
                  </div>
                  <div style={statCardStyle('#ff9800')}>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{securityStats.overview.failedLogins24h}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Failed Logins (24h)</div>
                  </div>
                  <div style={statCardStyle('#e91e63')}>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{securityStats.overview.blockedIPs}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Blocked IPs</div>
                  </div>
                  <div style={statCardStyle('#9c27b0')}>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{securityStats.overview.highRiskEvents}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>High Risk (7d)</div>
                  </div>
                  <div style={statCardStyle('#2196f3')}>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{securityStats.overview.total7d}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Events (7d)</div>
                  </div>
                  <div style={statCardStyle('#4caf50')}>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{securityStats.overview.failedLogins7d}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Failed Logins (7d)</div>
                  </div>
                </div>
              )}

              {/* Top Suspicious IPs */}
              {securityStats?.topSuspiciousIPs?.length > 0 && (
                <div style={{ marginBottom: '25px', padding: '15px', background: '#fff3e0', borderRadius: '10px', border: '1px solid #ff9800' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#e65100' }}>⚠️ Top Suspicious IPs (Last 7 Days)</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {securityStats.topSuspiciousIPs.map((item, i) => (
                      <span key={i} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ff9800', borderRadius: '20px', fontSize: '0.85rem' }}>
                        {item._id} — <strong>{item.count}</strong> events
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Block IP Form */}
              <div style={{ marginBottom: '25px', padding: '20px', background: '#fce4ec', borderRadius: '10px', border: '1px solid #f44336' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#c62828' }}>🚫 Manually Block an IP</h4>
                <form onSubmit={handleBlockIP} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>IP Address</label>
                    <input
                      type="text"
                      placeholder="192.168.1.1"
                      value={blockIPForm.ipAddress}
                      onChange={(e) => setBlockIPForm({ ...blockIPForm, ipAddress: e.target.value })}
                      required
                      style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: '2', minWidth: '200px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>Reason</label>
                    <input
                      type="text"
                      placeholder="Reason for blocking"
                      value={blockIPForm.reason}
                      onChange={(e) => setBlockIPForm({ ...blockIPForm, reason: e.target.value })}
                      style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ minWidth: '100px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>Duration (hrs)</label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={blockIPForm.duration}
                      onChange={(e) => setBlockIPForm({ ...blockIPForm, duration: parseInt(e.target.value) })}
                      style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button type="submit" style={{ ...deleteButtonStyle, padding: '10px 20px', whiteSpace: 'nowrap' }}>
                    🚫 Block IP
                  </button>
                </form>
              </div>

              {/* Currently Blocked IPs */}
              {blockedIPs.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🔒 Currently Blocked IPs ({blockedIPs.length})</h4>
                  <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ ...tableHeaderRowStyle, background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)' }}>
                          <th style={tableHeaderStyle}>IP Address</th>
                          <th style={tableHeaderStyle}>Reason</th>
                          <th style={tableHeaderStyle}>Blocked At</th>
                          <th style={tableHeaderStyle}>Expires</th>
                          <th style={tableHeaderStyle}>Type</th>
                          <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockedIPs.map(ip => (
                          <tr key={ip._id} style={tableRowStyle}>
                            <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontWeight: '600' }}>{ip.ipAddress}</td>
                            <td style={tableCellStyle}>{ip.reason}</td>
                            <td style={tableCellStyle}>{new Date(ip.blockedAt).toLocaleString()}</td>
                            <td style={tableCellStyle}>
                              {Math.max(0, Math.ceil((new Date(ip.expiresAt) - new Date()) / 60000))} min left
                            </td>
                            <td style={tableCellStyle}>
                              <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600', background: ip.isManual ? '#e3f2fd' : '#fce4ec', color: ip.isManual ? '#1565c0' : '#c62828' }}>
                                {ip.isManual ? 'Manual' : 'Auto'}
                              </span>
                            </td>
                            <td style={tableCellStyle}>
                              <button onClick={() => handleUnblockIP(ip.ipAddress)} style={{ ...approveButtonStyle, padding: '6px 12px', fontSize: '0.85rem' }}>
                                ✓ Unblock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Security Events Filters */}
              <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>Event Type</label>
                  <select
                    value={securityFilter.eventType}
                    onChange={(e) => setSecurityFilter({ ...securityFilter, eventType: e.target.value })}
                    style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.85rem' }}
                  >
                    <option value="">All Types</option>
                    <option value="failed_login">Failed Login</option>
                    <option value="successful_login">Successful Login</option>
                    <option value="captcha_failed">CAPTCHA Failed</option>
                    <option value="rate_limited">Rate Limited</option>
                    <option value="ip_blocked">IP Blocked</option>
                    <option value="brute_force_detected">Brute Force</option>
                    <option value="suspicious_activity">Suspicious</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>IP Address</label>
                  <input
                    type="text"
                    placeholder="Filter by IP"
                    value={securityFilter.ipAddress}
                    onChange={(e) => setSecurityFilter({ ...securityFilter, ipAddress: e.target.value })}
                    style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input
                    type="text"
                    placeholder="Filter by email"
                    value={securityFilter.email}
                    onChange={(e) => setSecurityFilter({ ...securityFilter, email: e.target.value })}
                    style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
                <button onClick={() => fetchSecurityEvents(1)} style={{ ...viewEventsButtonStyle, padding: '8px 16px', fontSize: '0.85rem' }}>
                  🔍 Search
                </button>
              </div>

              {/* Security Events Table */}
              <div style={tableContainerStyle}>
                {securityLoading ? (
                  <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading security events...</p>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ ...tableHeaderRowStyle, background: 'linear-gradient(135deg, #37474f 0%, #263238 100%)' }}>
                        <th style={tableHeaderStyle}>Time</th>
                        <th style={tableHeaderStyle}>Type</th>
                        <th style={tableHeaderStyle}>IP</th>
                        <th style={tableHeaderStyle}>Email</th>
                        <th style={tableHeaderStyle}>Action</th>
                        <th style={tableHeaderStyle}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityEvents.length > 0 ? securityEvents.map(event => (
                        <tr key={event._id} style={tableRowStyle}>
                          <td style={{ ...tableCellStyle, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {new Date(event.createdAt).toLocaleString()}
                          </td>
                          <td style={tableCellStyle}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600',
                              background: event.eventType.includes('fail') || event.eventType.includes('brute') ? '#fce4ec'
                                : event.eventType.includes('success') ? '#e8f5e9'
                                  : event.eventType.includes('blocked') ? '#ffebee'
                                    : '#fff3e0',
                              color: event.eventType.includes('fail') || event.eventType.includes('brute') ? '#c62828'
                                : event.eventType.includes('success') ? '#2e7d32'
                                  : event.eventType.includes('blocked') ? '#b71c1c'
                                    : '#e65100'
                            }}>
                              {event.eventType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}>{event.ipAddress}</td>
                          <td style={{ ...tableCellStyle, fontSize: '0.85rem' }}>{event.email || '—'}</td>
                          <td style={tableCellStyle}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600',
                              background: event.actionTaken === 'blocked' ? '#ffcdd2' : event.actionTaken === 'allowed' ? '#c8e6c9' : '#fff9c4',
                              color: event.actionTaken === 'blocked' ? '#b71c1c' : event.actionTaken === 'allowed' ? '#1b5e20' : '#f57f17'
                            }}>
                              {event.actionTaken}
                            </span>
                          </td>
                          <td style={{ ...tableCellStyle, fontSize: '0.8rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={event.details}>
                            {event.details?.substring(0, 60) || '—'}{event.details?.length > 60 ? '...' : ''}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No security events found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {securityPagination && securityPagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
                  <button
                    disabled={securityPage <= 1}
                    onClick={() => { setSecurityPage(p => p - 1); fetchSecurityEvents(securityPage - 1); }}
                    style={{ ...viewEventsButtonStyle, padding: '6px 14px', fontSize: '0.85rem', opacity: securityPage <= 1 ? 0.5 : 1 }}
                  >
                    ← Prev
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '0.9rem', color: '#666' }}>
                    Page {securityPagination.page} of {securityPagination.pages} ({securityPagination.total} total)
                  </span>
                  <button
                    disabled={securityPage >= securityPagination.pages}
                    onClick={() => { setSecurityPage(p => p + 1); fetchSecurityEvents(securityPage + 1); }}
                    style={{ ...viewEventsButtonStyle, padding: '6px 14px', fontSize: '0.85rem', opacity: securityPage >= securityPagination.pages ? 0.5 : 1 }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {/* Credentials Modal (Created) */}
      {newCredentials && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ color: '#2e7d32', marginTop: 0 }}>✅ Account Created Successfully!</h3>
            <p>Please share these credentials with the organizer immediately.</p>

            <div style={credentialBoxStyle}>
              <div style={credentialRowStyle}>
                <span style={labelStyle}>Club Name:</span>
                <span style={valueStyle}>{newCredentials.name}</span>
              </div>
              <div style={credentialRowStyle}>
                <span style={labelStyle}>Login Email:</span>
                <span style={{ ...valueStyle, color: '#1976d2' }}>{newCredentials.email}</span>
              </div>
              <div style={credentialRowStyle}>
                <span style={labelStyle}>Password:</span>
                <span style={{ ...valueStyle, fontFamily: 'monospace', background: '#fff3e0', padding: '2px 6px', borderRadius: '4px' }}>
                  {newCredentials.password}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setNewCredentials(null)}
                style={closeModalButtonStyle}
              >
                Done (I have copied it)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal (Reset) */}
      {resetCredentials && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ color: '#f57c00', marginTop: 0 }}>🔐 Password Reset Approved</h3>
            <p>The password for <strong>{resetCredentials.clubName}</strong> has been reset.</p>
            <p>Please share the new password with the organizer:</p>

            <div style={credentialBoxStyle}>
              <div style={credentialRowStyle}>
                <span style={labelStyle}>Login Email:</span>
                <span style={valueStyle}>{resetCredentials.email}</span>
              </div>
              <div style={credentialRowStyle}>
                <span style={labelStyle}>New Password:</span>
                <span style={{ ...valueStyle, fontFamily: 'monospace', background: '#fff3e0', padding: '2px 6px', borderRadius: '4px', fontSize: '1.2rem' }}>
                  {resetCredentials.password}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setResetCredentials(null)}
                style={closeModalButtonStyle}
              >
                Done (I have copied it)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Additional Styles
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' };
const credentialBoxStyle = { background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginTop: '15px', border: '1px solid #ddd' };
const credentialRowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' };
const labelStyle = { fontWeight: '600', color: '#666' };
const valueStyle = { fontWeight: 'bold', color: '#333' };
const closeModalButtonStyle = { padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };

const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
};

const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 40px',
  background: 'white',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
};

const navBrandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
};

const navIconStyle = {
  fontSize: '2rem'
};

const navTitleStyle = {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: '700',
  color: '#333'
};

const logoutButtonStyle = {
  padding: '10px 24px',
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)'
};

const contentStyle = {
  padding: '40px',
  maxWidth: '1400px',
  margin: '0 auto'
};

const sectionStyle = {
  background: 'white',
  borderRadius: '15px',
  padding: '30px',
  marginBottom: '30px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  border: '2px solid transparent'
};

const sectionHeaderStyle = {
  fontSize: '1.5rem',
  fontWeight: '600',
  color: '#333',
  marginBottom: '25px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const sectionIconStyle = {
  fontSize: '1.8rem'
};

const formStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '15px'
};

const inputStyle = {
  padding: '12px 16px',
  fontSize: '1rem',
  border: '2px solid #e0e0e0',
  borderRadius: '8px',
  outline: 'none',
  transition: 'border-color 0.3s'
};

const textareaStyle = {
  padding: '12px 16px',
  fontSize: '1rem',
  border: '2px solid #e0e0e0',
  borderRadius: '8px',
  outline: 'none',
  minHeight: '100px',
  fontFamily: 'inherit',
  resize: 'vertical',
  transition: 'border-color 0.3s'
};

const submitButtonStyle = {
  padding: '14px',
  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  boxShadow: '0 4px 15px rgba(56, 239, 125, 0.4)'
};

const requestListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '15px'
};

const requestItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  background: 'linear-gradient(135deg, #fff5e1 0%, #ffe6cc 100%)',
  borderRadius: '10px',
  border: '2px solid #ff9800'
};

const requestInfoStyle = {
  fontSize: '1rem',
  color: '#333'
};

const requestActionsStyle = {
  display: 'flex',
  gap: '10px'
};

const approveButtonStyle = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.95rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.2s'
};

const rejectButtonStyle = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.95rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.2s'
};

const emptyMessageStyle = {
  fontSize: '1rem',
  color: '#666',
  textAlign: 'center',
  padding: '20px'
};

const tableContainerStyle = {
  overflowX: 'auto'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse'
};

const tableHeaderRowStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white'
};

const tableHeaderStyle = {
  padding: '15px',
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '1rem'
};

const tableRowStyle = {
  borderBottom: '1px solid #e0e0e0',
  transition: 'background 0.2s'
};

const tableCellStyle = {
  padding: '15px',
  fontSize: '0.95rem',
  color: '#333'
};

const deleteButtonStyle = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.2s'
};

const viewEventsButtonStyle = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.2s'
};

const eventsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '20px',
  marginTop: '20px'
};

const eventCardStyle = {
  background: 'white',
  border: '2px solid #e0e0e0',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease'
};

const eventCardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '10px'
};

const eventTypeStyle = {
  padding: '4px 12px',
  background: '#667eea',
  color: 'white',
  borderRadius: '12px',
  fontSize: '0.75rem',
  fontWeight: '600'
};

const eventDescStyle = {
  fontSize: '0.9rem',
  color: '#666',
  marginBottom: '15px',
  lineHeight: '1.5'
};

const eventMetaStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  marginBottom: '15px',
  padding: '10px',
  background: '#f5f5f5',
  borderRadius: '6px'
};

const eventDeleteButtonStyle = {
  width: '100%',
  padding: '10px',
  background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};

const eventTypeBadgeStyle = {
  padding: '4px 10px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  borderRadius: '12px',
  fontSize: '0.8rem',
  fontWeight: '600'
};

const statCardStyle = (color) => ({
  padding: '20px',
  background: `linear-gradient(135deg, ${color}10, ${color}20)`,
  borderRadius: '12px',
  border: `2px solid ${color}30`,
  textAlign: 'center'
});

export default AdminDashboard;