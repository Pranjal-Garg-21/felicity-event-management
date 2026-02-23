import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';


const CreateEvent = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // 1. State must include all mandatory attributes
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Normal',
    eligibility: '',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    registrationLimit: '',
    registrationFee: '',
    tags: ''
  });

  const [customFields] = useState([]); // Keep for customFormFields in API call

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      // Sending all required attributes to the backend
      await axios.post('${API_BASE_URL}/api/events', {
        ...formData,
        customFormFields: customFields 
      }, config);
      
      alert("🎉 Event Published Successfully!");
      navigate('/organizer-dashboard');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error creating event. Check all fields.");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={formBoxStyle}>
        <h2 style={titleStyle}>🆕 Create New Event</h2>
        <form onSubmit={handleSubmit} style={gridFormStyle}>
          
          {/* Basic Info */}
          <input type="text" placeholder="Event Name" style={inputStyle} 
            onChange={e => setFormData({...formData, name: e.target.value})} required />
          
          <select style={inputStyle} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="Normal">Normal Event (Individual)</option>
            <option value="Merchandise">Merchandise Event</option>
          </select>

          <textarea placeholder="Event Description" style={{...inputStyle, gridColumn: 'span 2'}} 
            onChange={e => setFormData({...formData, description: e.target.value})} required />

          {/* Section 8 Mandatory Attributes */}
          <input type="text" placeholder="Eligibility (e.g. All Students)" style={inputStyle} 
            onChange={e => setFormData({...formData, eligibility: e.target.value})} required />
          
          <input type="number" placeholder="Registration Limit" style={inputStyle} 
            onChange={e => setFormData({...formData, registrationLimit: e.target.value})} required />

          <input type="number" placeholder="Registration Fee (₹)" style={inputStyle} 
            onChange={e => setFormData({...formData, registrationFee: e.target.value})} required />

          <input type="text" placeholder="Tags (comma separated)" style={inputStyle} 
            onChange={e => setFormData({...formData, tags: e.target.value.split(',')})} />

          {/* Date Fields */}
          <div style={dateGroup}>
            <label style={labelStyle}>Registration Deadline</label>
            <input type="datetime-local" style={inputStyle} 
              onChange={e => setFormData({...formData, registrationDeadline: e.target.value})} required />
          </div>

          <div style={dateGroup}>
            <label style={labelStyle}>Event Start Date</label>
            <input type="datetime-local" style={inputStyle} 
              onChange={e => setFormData({...formData, startDate: e.target.value})} required />
          </div>

          <div style={dateGroup}>
            <label style={labelStyle}>Event End Date</label>
            <input type="datetime-local" style={inputStyle} 
              onChange={e => setFormData({...formData, endDate: e.target.value})} required />
          </div>

          <button type="submit" style={submitButtonStyle}>Publish Event</button>
        </form>
      </div>
    </div>
  );
};

// Reusing your visual styles from Signup/Login
const containerStyle = { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', padding: '20px' };
const formBoxStyle = { background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '700px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' };
const gridFormStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const inputStyle = { padding: '12px', border: '2px solid #eee', borderRadius: '8px', fontSize: '1rem' };
const dateGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '0.8rem', fontWeight: 'bold', color: '#777' };
const titleStyle = { textAlign: 'center', marginBottom: '20px', color: '#333' };
const submitButtonStyle = { gridColumn: 'span 2', padding: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };

export default CreateEvent;