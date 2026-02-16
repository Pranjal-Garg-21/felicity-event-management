import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]); // State for password requests
  const [allEvents, setAllEvents] = useState([]); // State for all events
  const [selectedOrganizer, setSelectedOrganizer] = useState(null); // For viewing specific organizer's events
  const [formData, setFormData] = useState({
    organizerName: '',
    email: '',
    password: '',
    category: '',
    description: '',
    contactNumber: '',
    discordWebhook: ''
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchOrganizers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('http://localhost:5000/api/admin/organizers', config);
      setOrganizers(data);
    } catch (err) {
      console.error("Error fetching organizers", err);
    }
  };

  const fetchAllEvents = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('http://localhost:5000/api/admin/all-events', config);
      setAllEvents(data);
    } catch (err) {
      console.error("Error fetching all events", err);
    }
  };

  // Logic to fetch users with status 'Pending'
  const fetchResetRequests = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('http://localhost:5000/api/admin/reset-requests', config);
      setResetRequests(data);
    } catch (err) {
      console.error("Error fetching reset requests", err);
    }
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
      await axios.post('http://localhost:5000/api/admin/handle-reset', { userId, action }, config);
      alert(`Request ${action}ed!`);
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
      await axios.post('http://localhost:5000/api/admin/create-organizer', formData, config);
      alert("✅ Organizer Account Created!");
      setFormData({ organizerName: '', email: '', password: '', category: '', description: '', contactNumber: '', discordWebhook: '' });
      fetchOrganizers();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating organizer");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this club? All their events will also be deleted.")) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`http://localhost:5000/api/admin/organizer/${id}`, config);
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
        await axios.delete(`http://localhost:5000/api/admin/event/${eventId}`, config);
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
              placeholder="Club Name" 
              value={formData.organizerName} 
              onChange={(e) => setFormData({...formData, organizerName: e.target.value})} 
              required 
              style={inputStyle}
            />
            <input 
              type="email" 
              placeholder="Login Email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              required 
              style={inputStyle}
            />
            <input 
              type="password" 
              placeholder="Temporary Password" 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              required 
              style={inputStyle}
            />
            <input 
              type="text" 
              placeholder="Category" 
              value={formData.category} 
              onChange={(e) => setFormData({...formData, category: e.target.value})} 
              required 
              style={inputStyle}
            />
            <input 
              type="text" 
              placeholder="Contact Number (optional)" 
              value={formData.contactNumber} 
              onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} 
              style={inputStyle}
            />
            <textarea 
              style={{...textareaStyle, gridColumn: 'span 2'}} 
              placeholder="Description" 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
            />
            <input 
              type="url" 
              placeholder="Discord Webhook URL (optional)" 
              value={formData.discordWebhook} 
              onChange={(e) => setFormData({...formData, discordWebhook: e.target.value})} 
              style={{...inputStyle, gridColumn: 'span 2'}}
              title="Get this from Discord: Server Settings → Integrations → Webhooks"
            />
            <div style={{gridColumn: 'span 2', fontSize: '0.85rem', color: '#666', marginTop: '-10px', marginBottom: '10px'}}>
              💡 <strong>Discord Webhook:</strong> Events will auto-post to Discord when published. Get webhook URL from: Server Settings → Integrations → Webhooks
            </div>
            <button type="submit" style={{...submitButtonStyle, gridColumn: 'span 2'}}>
              ✅ Create Account
            </button>
          </form>
        </section>

        {/* SECTION 11.2: Password Reset Requests */}
        <section style={{...sectionStyle, borderColor: '#ff9800'}}>
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
                        style={{...viewEventsButtonStyle, marginRight: '10px'}}
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
          <section style={{...sectionStyle, borderColor: '#9c27b0'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={sectionHeaderStyle}>
                <span style={sectionIconStyle}>📅</span>
                Events by {selectedOrganizer.organizerName}
              </h3>
              <button 
                onClick={() => setSelectedOrganizer(null)}
                style={{...deleteButtonStyle, background: '#666'}}
              >
                ✕ Close
              </button>
            </div>
            {getOrganizerEvents(selectedOrganizer._id).length > 0 ? (
              <div style={eventsGridStyle}>
                {getOrganizerEvents(selectedOrganizer._id).map(event => (
                  <div key={event._id} style={eventCardStyle}>
                    <div style={eventCardHeaderStyle}>
                      <h4 style={{margin: '0 0 5px 0', color: '#333'}}>{event.name}</h4>
                      <span style={eventTypeStyle}>{event.type}</span>
                    </div>
                    <p style={eventDescStyle}>{event.description?.substring(0, 100)}...</p>
                    <div style={eventMetaStyle}>
                      <div style={{fontSize: '0.85rem', color: '#666'}}>
                        📅 {event.eventSessions && event.eventSessions[0] 
                          ? new Date(event.eventSessions[0].startDate).toLocaleDateString()
                          : new Date(event.startDate).toLocaleDateString()}
                      </div>
                      <div style={{fontSize: '0.85rem', color: '#666'}}>
                        👥 {event.participants?.length || 0} registered
                      </div>
                      {event.type === 'Team' && (
                        <div style={{fontSize: '0.85rem', color: '#666'}}>
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
        <section style={{...sectionStyle, borderColor: '#4caf50'}}>
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
      </div>
    </div>
  );
};

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

export default AdminDashboard;