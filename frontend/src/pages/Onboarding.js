import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import axios from 'axios';
import API_BASE_URL from '../config/api';


const Onboarding = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);

  const interestOptions = ["Music", "Dance", "Technical", "Art", "Literature", "Sports"];

  // Fetch clubs and user's existing data
  useEffect(() => {
    const fetchData = async () => {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      // Fetch all organizers
      const organizersRes = await axios.get(`${API_BASE_URL}/api/users/organizers`, config);
      setOrganizers(organizersRes.data);

      // Fetch user's profile to get existing interests and followed clubs
      const profileRes = await axios.get(`${API_BASE_URL}/api/users/profile`, config);

      console.log('User profile data:', profileRes.data);
      console.log('Followed clubs from profile:', profileRes.data.followedClubs);

      // Set existing interests and followed clubs
      if (profileRes.data.interests) {
        setSelectedInterests(profileRes.data.interests);
      }
      if (profileRes.data.followedClubs) {
        // Extract just the IDs from populated clubs
        const clubIds = profileRes.data.followedClubs.map(club =>
          typeof club === 'string' ? club : club._id
        );
        console.log('Extracted club IDs:', clubIds);
        setFollowedClubs(clubIds);
      }
    };

    fetchData();
  }, [user]);

  const handleToggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleToggleClub = (clubId) => {
    setFollowedClubs(prev =>
      prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
    );
  };

  const handleFinish = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`${API_BASE_URL}/api/users/update-onboarding`, {
        interests: selectedInterests,
        followedClubs,
        hasCompletedOnboarding: true
      }, config);

      console.log('Onboarding update response:', data);

      // Extract club IDs for context
      const clubIds = data.followedClubs?.map(club =>
        typeof club === 'string' ? club : club._id
      ) || [];

      // Update local storage/context with new user data
      login({
        ...user,
        hasCompletedOnboarding: true,
        interests: data.interests,
        followedClubs: clubIds
      });

      navigate('/dashboard');
    } catch (err) {
      console.error("Onboarding failed", err);
    }
  };

  const handleSkip = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${API_BASE_URL}/api/users/update-onboarding`, {
        interests: [],
        followedClubs: [],
        hasCompletedOnboarding: true
      }, config);

      // Update local storage/context to mark onboarding as complete
      login({ ...user, hasCompletedOnboarding: true });
      navigate('/dashboard');
    } catch (err) {
      console.error("Skip onboarding failed", err);
      // Even if API fails, mark as complete locally to avoid infinite loop
      login({ ...user, hasCompletedOnboarding: true });
      navigate('/dashboard');
    }
  };

  return (
    <div style={onboardingContainerStyle}>
      <h2>{user?.hasCompletedOnboarding ? "Update Your Preferences ⚙️" : "Welcome to Felicity! 🎡"}</h2>
      <p>{user?.hasCompletedOnboarding ? "Manage your interests and followed clubs" : "Personalize your experience (or skip and do it later)"}</p>

      <h3>1. Select Interests</h3>
      <div style={tagContainerStyle}>
        {interestOptions.map(opt => (
          <button
            key={opt}
            onClick={() => handleToggleInterest(opt)}
            style={selectedInterests.includes(opt) ? activeTagStyle : tagStyle}
          >
            {opt}
          </button>
        ))}
      </div>

      <h3>2. Suggested Clubs</h3>
      <div style={clubGridStyle}>
        {organizers.map(org => (
          <div key={org._id} style={clubCardStyle}>
            <h4 style={{ margin: '0 0 10px 0' }}>{org.organizerName}</h4>
            <p style={{ fontSize: '0.9rem', margin: '5px 0', opacity: 0.8 }}>{org.category}</p>
            <button
              onClick={() => handleToggleClub(org._id)}
              style={followedClubs.includes(org._id) ? activeFollowButtonStyle : followButtonStyle}
            >
              {followedClubs.includes(org._id) ? "✓ Following" : "+ Follow"}
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleFinish} style={finishButtonStyle}>
        {user?.hasCompletedOnboarding ? "Save Changes" : "Finish & Explore"}
      </button>

      {!user?.hasCompletedOnboarding && (
        <button onClick={handleSkip} style={skipButtonStyle}>Skip for now</button>
      )}

      {user?.hasCompletedOnboarding && (
        <button onClick={() => navigate('/dashboard')} style={skipButtonStyle}>Cancel</button>
      )}
    </div>
  );
};

// Styles
const onboardingContainerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  color: 'white'
};

const tagContainerStyle = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  margin: '20px 0',
  justifyContent: 'center'
};

const tagStyle = {
  padding: '10px 20px',
  background: 'rgba(255, 255, 255, 0.2)',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '25px',
  color: 'white',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontWeight: '500'
};

const activeTagStyle = {
  ...tagStyle,
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#667eea',
  border: '2px solid white',
  transform: 'scale(1.05)'
};

const clubGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '20px',
  width: '100%',
  maxWidth: '1000px',
  margin: '20px 0'
};

const clubCardStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  padding: '20px',
  borderRadius: '15px',
  textAlign: 'center',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
};

const followButtonStyle = {
  padding: '8px 20px',
  background: 'rgba(255, 255, 255, 0.2)',
  border: '2px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '20px',
  color: 'white',
  cursor: 'pointer',
  marginTop: '10px',
  fontWeight: '500',
  transition: 'all 0.3s ease'
};

const activeFollowButtonStyle = {
  ...followButtonStyle,
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#667eea',
  border: '2px solid white'
};

const finishButtonStyle = {
  padding: '15px 40px',
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '30px',
  fontSize: '1.1rem',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '30px',
  boxShadow: '0 10px 30px rgba(245, 87, 108, 0.4)',
  transition: 'all 0.3s ease'
};

const skipButtonStyle = {
  padding: '12px 30px',
  background: 'transparent',
  color: 'white',
  border: '2px solid rgba(255, 255, 255, 0.5)',
  borderRadius: '30px',
  fontSize: '1rem',
  fontWeight: '500',
  cursor: 'pointer',
  marginTop: '15px',
  marginLeft: '10px',
  transition: 'all 0.3s ease'
};

export default Onboarding;