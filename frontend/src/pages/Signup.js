import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', contactNumber: '' ,participantType: 'Non-IIIT', collegeName: ''});
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', formData);
      alert("Registration Successful! Please login.");
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={signupBoxStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>🎓 Participant Registration</h1>
          <p style={subtitleStyle}>Join Felicity and explore amazing events</p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>👤 First Name</label>
            <input 
              type="text" 
              placeholder="Enter your first name" 
              onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
              required 
              style={inputStyle}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>👤 Last Name</label>
            <input 
              type="text" 
              placeholder="Enter your last name" 
              onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
              required 
              style={inputStyle}
            />
          </div>
          

          <div style={inputGroupStyle}>
            <label style={labelStyle}>📧 Email Address</label>
            <input 
              type="email" 
              placeholder="your.email@iiit.ac.in" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              required 
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>🔒 Password</label>
            <input 
              type="password" 
              placeholder="Create a secure password" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              required 
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>📱 Contact Number</label>
            <input 
              type="text" 
              placeholder="Your phone number (optional)" 
              onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} 
              style={inputStyle}
            />
          </div>
           {/* 1. Add Participant Type Toggle */}
<div style={inputGroupStyle}>
  <label style={labelStyle}>🎓 Student Status</label>
  <select 
    style={inputStyle}
    value={formData.participantType}
    onChange={(e) => setFormData({...formData, participantType: e.target.value})}
  >
    <option value="Non-IIIT">Non-IIIT Student</option>
    <option value="IIIT">IIIT Hyderabad Student</option>
  </select>
</div>

{/* 2. College Name Field (Auto-filled for IIITians) */}
<div style={inputGroupStyle}>
  <label style={labelStyle}>🏫 College Name</label>
  <input 
    type="text" 
    placeholder={formData.participantType === 'IIIT' ? "IIIT Hyderabad" : "Enter your college name"} 
    value={formData.participantType === 'IIIT' ? "IIIT Hyderabad" : formData.collegeName}
    onChange={(e) => setFormData({...formData, collegeName: e.target.value})} 
    disabled={formData.participantType === 'IIIT'} 
    required={formData.participantType === 'Non-IIIT'} 
    style={inputStyle}
  />
</div>
          <button type="submit" style={submitButtonStyle}>
            Create Account
          </button>
        </form>

        <div style={loginSectionStyle}>
          <p style={loginTextStyle}>Already have an account?</p>
          <button 
            onClick={() => navigate('/login')} 
            style={loginButtonStyle}
          >
            Login here
          </button>
        </div>

        <button 
          onClick={() => navigate('/')} 
          style={backButtonStyle}
        >
          ← Back to Role Selection
        </button>
      </div>
    </div>
  );
};

const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '20px'
};

const signupBoxStyle = {
  background: 'white',
  borderRadius: '20px',
  padding: '50px 40px',
  maxWidth: '500px',
  width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '40px'
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  color: '#333',
  marginBottom: '10px'
};

const subtitleStyle = {
  fontSize: '0.95rem',
  color: '#666'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const labelStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#555'
};

const inputStyle = {
  padding: '12px 16px',
  fontSize: '1rem',
  border: '2px solid #e0e0e0',
  borderRadius: '8px',
  outline: 'none',
  transition: 'border-color 0.3s'
};

const submitButtonStyle = {
  padding: '14px',
  fontSize: '1rem',
  fontWeight: '600',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginTop: '10px',
  transition: 'transform 0.2s, box-shadow 0.2s',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
};

const loginSectionStyle = {
  marginTop: '30px',
  textAlign: 'center',
  paddingTop: '20px',
  borderTop: '1px solid #e0e0e0'
};

const loginTextStyle = {
  fontSize: '0.95rem',
  color: '#666',
  marginBottom: '10px'
};

const loginButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#667eea',
  fontSize: '1rem',
  fontWeight: '600',
  textDecoration: 'underline',
  cursor: 'pointer',
  padding: '5px'
};

const backButtonStyle = {
  width: '100%',
  marginTop: '20px',
  padding: '12px',
  background: 'transparent',
  border: '2px solid #667eea',
  color: '#667eea',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s'
};

export default Signup;