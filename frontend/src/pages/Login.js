import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the role from URL query parameters
  const params = new URLSearchParams(location.search);
  const role = params.get('role');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send the expected role to backend for validation
      const { data } = await axios.post('http://localhost:5000/api/auth/login', { 
        email, 
        password,
        expectedRole: role // Send the role from URL parameter
      });
      console.log('Login response:', data);
      console.log('hasCompletedOnboarding:', data.hasCompletedOnboarding);
      
      login(data);
      
      // Check if participant needs onboarding
      if (data.role === 'Participant' && !data.hasCompletedOnboarding) {
        console.log('Redirecting to onboarding...');
        navigate('/onboarding');
      } else {
        console.log('Redirecting to determine-dashboard...');
        navigate('/determine-dashboard');
      }
    } catch (err) {
      // Show specific error message from backend
      const errorMessage = err.response?.data?.message || "Invalid email or password";
      alert(errorMessage);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={loginBoxStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>🎉 Felicity Login</h1>
          <p style={subtitleStyle}>Welcome back! Please login to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>📧 Email Address</label>
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>🔒 Password</label>
            <input 
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={inputStyle}
            />
          </div>

          <button type="submit" style={submitButtonStyle}>
            Login
          </button>
        </form>

        {/* Only show signup option for Participant/Student role */}
        {role === 'Participant' && (
          <div style={signupSectionStyle}>
            <p style={signupTextStyle}>New Student?</p>
            <button 
              onClick={() => navigate('/signup')} 
              style={signupButtonStyle}
            >
              Register here
            </button>
          </div>
        )}

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

const loginBoxStyle = {
  background: 'white',
  borderRadius: '20px',
  padding: '50px 40px',
  maxWidth: '450px',
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
  transition: 'border-color 0.3s',
  ':focus': {
    borderColor: '#667eea'
  }
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
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)'
  }
};

const signupSectionStyle = {
  marginTop: '30px',
  textAlign: 'center',
  paddingTop: '20px',
  borderTop: '1px solid #e0e0e0'
};

const signupTextStyle = {
  fontSize: '0.95rem',
  color: '#666',
  marginBottom: '10px'
};

const signupButtonStyle = {
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

export default Login;