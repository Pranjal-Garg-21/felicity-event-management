import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const Signup = () => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', contactNumber: '', participantType: 'Non-IIIT', collegeName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState('');
  const captchaRef = useRef(null);
  const navigate = useNavigate();

  // Render reCAPTCHA v2 checkbox widget
  useEffect(() => {
    const renderCaptcha = () => {
      if (window.grecaptcha && captchaRef.current && !captchaRef.current.hasChildNodes()) {
        window.grecaptcha.render(captchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token) => {
            setCaptchaToken(token);
            setCaptchaError('');
          },
          'expired-callback': () => {
            setCaptchaToken(null);
            setCaptchaError('CAPTCHA expired. Please verify again.');
          },
          'error-callback': () => {
            setCaptchaError('CAPTCHA error. Please try again.');
          },
          theme: 'light',
          size: 'normal'
        });
      }
    };

    if (window.grecaptcha && window.grecaptcha.render) {
      renderCaptcha();
    } else {
      const interval = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.render) {
          renderCaptcha();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if CAPTCHA is completed
    if (!captchaToken) {
      setCaptchaError('⚠️ Please complete the CAPTCHA verification first!');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        ...formData,
        captchaToken
      });
      alert("✅ Registration Successful! Please login.");
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed");
      // Reset CAPTCHA after failed attempt
      if (window.grecaptcha) {
        window.grecaptcha.reset();
        setCaptchaToken(null);
      }
    } finally {
      setIsSubmitting(false);
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
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>👤 Last Name</label>
            <input
              type="text"
              placeholder="Enter your last name"
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>📧 Email Address</label>
            <input
              type="email"
              placeholder="your.email@iiit.ac.in"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>🔒 Password</label>
            <input
              type="password"
              placeholder="Create a secure password"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>📱 Contact Number</label>
            <input
              type="text"
              placeholder="Your phone number (optional)"
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Participant Type Toggle */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>🎓 Student Status</label>
            <select
              style={inputStyle}
              value={formData.participantType}
              onChange={(e) => setFormData({ ...formData, participantType: e.target.value })}
            >
              <option value="Non-IIIT">Non-IIIT Student</option>
              <option value="IIIT">IIIT Hyderabad Student</option>
            </select>
          </div>

          {/* College Name Field */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>🏫 College Name</label>
            <input
              type="text"
              placeholder={formData.participantType === 'IIIT' ? "IIIT Hyderabad" : "Enter your college name"}
              value={formData.participantType === 'IIIT' ? "IIIT Hyderabad" : formData.collegeName}
              onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
              disabled={formData.participantType === 'IIIT'}
              required={formData.participantType === 'Non-IIIT'}
              style={inputStyle}
            />
          </div>

          {/* reCAPTCHA v2 Checkbox - "I'm not a robot" */}
          <div style={captchaContainerStyle}>
            <label style={{ ...labelStyle, marginBottom: '10px', display: 'block' }}>🛡️ Security Verification</label>
            <div style={{ display: 'flex', justifyContent: 'center', minHeight: '78px', overflow: 'visible' }}>
              <div ref={captchaRef}></div>
            </div>
            {captchaError && (
              <p style={captchaErrorStyle}>{captchaError}</p>
            )}
            {captchaToken && (
              <p style={captchaSuccessStyle}>✅ Verified! You may proceed.</p>
            )}
          </div>

          <button type="submit" style={{
            ...submitButtonStyle,
            opacity: (isSubmitting || !captchaToken) ? 0.7 : 1,
            cursor: (isSubmitting || !captchaToken) ? 'not-allowed' : 'pointer'
          }} disabled={isSubmitting}>
            {isSubmitting ? '🔐 Creating Account...' : '📝 Create Account'}
          </button>

          {/* reCAPTCHA notice */}
          <p style={captchaNoticeStyle}>
            🔒 This site is protected by reCAPTCHA and the Google{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Privacy Policy</a> and{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Terms of Service</a> apply.
          </p>
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

const captchaContainerStyle = {
  background: '#f8f9ff',
  border: '2px solid #d0d5f2',
  borderRadius: '12px',
  padding: '18px 16px',
  textAlign: 'center',
  overflow: 'visible'
};

const captchaErrorStyle = {
  color: '#d32f2f',
  fontSize: '0.85rem',
  marginTop: '8px',
  fontWeight: '600'
};

const captchaSuccessStyle = {
  color: '#2e7d32',
  fontSize: '0.85rem',
  marginTop: '8px',
  fontWeight: '600'
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

const captchaNoticeStyle = {
  textAlign: 'center',
  fontSize: '0.75rem',
  color: '#999',
  margin: '5px 0 0 0'
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