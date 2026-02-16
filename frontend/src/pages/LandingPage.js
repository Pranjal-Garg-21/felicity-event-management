import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // If already logged in, send user to their dashboard
    if (user) navigate('/determine-dashboard');
  }, [user, navigate]);

  return (
    <div style={containerStyle}>
      <div style={contentBoxStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>🎉 Felicity Event Management</h1>
          <p style={subtitleStyle}>Select your role to access the dashboard</p>
        </div>
        
        <div style={cardContainerStyle}>
          <div style={cardStyle} onClick={() => navigate('/login?role=Admin')}>
            <div style={iconStyle}>👨‍💼</div>
            <h3 style={cardTitleStyle}>Admin</h3>
            <p style={cardDescStyle}>Manage clubs and organizers</p>
          </div>

          <div style={{...cardStyle, ...cardHoverStyle}} onClick={() => navigate('/login?role=Organizer')}>
            <div style={iconStyle}>🎭</div>
            <h3 style={cardTitleStyle}>Organizer</h3>
            <p style={cardDescStyle}>Create and manage events</p>
          </div>

          <div style={cardStyle} onClick={() => navigate('/login?role=Participant')}>
            <div style={iconStyle}>🎓</div>
            <h3 style={cardTitleStyle}>Participant</h3>
            <p style={cardDescStyle}>Browse and register for events</p>
          </div>
        </div>
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

const contentBoxStyle = {
  maxWidth: '1000px',
  width: '100%'
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '50px',
  color: 'white'
};

const titleStyle = {
  fontSize: '3rem',
  fontWeight: '700',
  marginBottom: '10px',
  textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
};

const subtitleStyle = {
  fontSize: '1.2rem',
  opacity: '0.95',
  fontWeight: '300'
};

const cardContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '30px',
  padding: '20px'
};

const cardStyle = {
  background: 'white',
  borderRadius: '15px',
  padding: '40px 30px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  ':hover': {
    transform: 'translateY(-10px)',
    boxShadow: '0 15px 40px rgba(0,0,0,0.3)'
  }
};

const cardHoverStyle = {
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
};

const iconStyle = {
  fontSize: '4rem',
  marginBottom: '20px'
};

const cardTitleStyle = {
  fontSize: '1.5rem',
  fontWeight: '600',
  marginBottom: '10px',
  color: '#333'
};

const cardDescStyle = {
  fontSize: '0.95rem',
  color: '#666',
  lineHeight: '1.5'
};

export default LandingPage;