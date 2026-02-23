import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LcLkm4sAAAAAPS0gpLUg1aHYvR2gn39xDEGxSnr';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState('');
  const captchaRef = useRef(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the role from URL query parameters
  const params = new URLSearchParams(location.search);
  const role = params.get('role');

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

    // Wait for reCAPTCHA script to load
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
      const { data } = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
        expectedRole: role,
        captchaToken
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
      const errorMessage = err.response?.data?.message || "Invalid email or password";
      alert(errorMessage);
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
            {isSubmitting ? '🔐 Logging in...' : '🔓 Login'}
          </button>

          {/* reCAPTCHA notice */}
          <p style={captchaNoticeStyle}>
            🔒 This site is protected by reCAPTCHA and the Google{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Privacy Policy</a> and{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Terms of Service</a> apply.
          </p>
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
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)'
  }
};

const captchaNoticeStyle = {
  textAlign: 'center',
  fontSize: '0.75rem',
  color: '#999',
  margin: '5px 0 0 0'
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