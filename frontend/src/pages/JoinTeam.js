import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const JoinTeam = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('');
  const [teamInfo, setTeamInfo] = useState(null);

  useEffect(() => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: `/join-team/${inviteCode}` } });
      return;
    }

    // Auto-join team on mount
    joinTeam();
  }, [user, inviteCode]);

  const joinTeam = async () => {
    if (!inviteCode) {
      setStatus('error');
      setMessage('Invalid invite code');
      setLoading(false);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(
        `http://localhost:5000/api/teams/join/${inviteCode}`,
        {},
        config
      );

      setStatus('success');
      setTeamInfo(data.team);
      
      if (data.team.status === 'Complete') {
        setMessage(
          `🎉 Congratulations! You've successfully joined "${data.team.teamName}"!\n\n` +
          `✅ Your team is now complete with all ${data.team.teamSize} members!\n\n` +
          `🎫 Tickets have been generated for all team members.\n\n` +
          `You can view your ticket and team details in your dashboard.`
        );
      } else {
        const acceptedCount = data.team.members.filter(m => m.status === 'Accepted').length;
        setMessage(
          `✅ You've successfully joined "${data.team.teamName}"!\n\n` +
          `👥 Team Progress: ${acceptedCount}/${data.team.teamSize} members accepted\n\n` +
          `⏳ Waiting for ${data.team.teamSize - acceptedCount} more member(s) to accept.\n\n` +
          `Once all members accept, tickets will be generated automatically.`
        );
      }

      setLoading(false);

      // Redirect after 5 seconds
      setTimeout(() => {
        navigate('/teams');
      }, 5000);

    } catch (err) {
      console.error('Join team error:', err);
      setStatus('error');
      setMessage(err.response?.data?.message || 'Error joining team. The invite may be invalid or expired.');
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '50px 40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    textAlign: 'center'
  };

  const iconStyle = {
    fontSize: '4rem',
    marginBottom: '20px'
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#333'
  };

  const messageStyle = {
    fontSize: '1.1rem',
    lineHeight: '1.8',
    color: '#555',
    whiteSpace: 'pre-line',
    marginBottom: '30px'
  };

  const buttonStyle = {
    padding: '14px 32px',
    fontSize: '1rem',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#667eea',
    color: '#fff',
    marginTop: '10px'
  };

  const spinnerStyle = {
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #667eea',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    animation: 'spin 1s linear infinite',
    margin: '20px auto'
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          button:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          }
        `}
      </style>

      <div style={cardStyle}>
        {loading && (
          <>
            <div style={iconStyle}>⏳</div>
            <h2 style={titleStyle}>Processing Invitation...</h2>
            <div style={spinnerStyle}></div>
            <p style={{color: '#666', fontSize: '0.95rem'}}>Please wait while we add you to the team</p>
          </>
        )}

        {!loading && status === 'success' && (
          <>
            <div style={iconStyle}>
              {teamInfo?.status === 'Complete' ? '🎉' : '✅'}
            </div>
            <h2 style={titleStyle}>
              {teamInfo?.status === 'Complete' ? 'Team Complete!' : 'Successfully Joined!'}
            </h2>
            <p style={messageStyle}>{message}</p>
            
            {teamInfo && (
              <div style={{
                backgroundColor: '#f5f5f5',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <h3 style={{margin: '0 0 10px 0', fontSize: '1.1rem', color: '#333'}}>
                  Team Details
                </h3>
                <p style={{margin: '5px 0', color: '#555'}}>
                  <strong>Team:</strong> {teamInfo.teamName}
                </p>
                <p style={{margin: '5px 0', color: '#555'}}>
                  <strong>Event:</strong> {teamInfo.eventId?.name || 'N/A'}
                </p>
                <p style={{margin: '5px 0', color: '#555'}}>
                  <strong>Status:</strong> {teamInfo.status}
                </p>
              </div>
            )}

            <button
              onClick={() => navigate('/teams')}
              style={buttonStyle}
            >
              View My Teams
            </button>
            <p style={{marginTop: '15px', fontSize: '0.85rem', color: '#999'}}>
              Redirecting automatically in 5 seconds...
            </p>
          </>
        )}

        {!loading && status === 'error' && (
          <>
            <div style={iconStyle}>❌</div>
            <h2 style={titleStyle}>Unable to Join Team</h2>
            <p style={messageStyle}>{message}</p>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap'}}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{...buttonStyle, backgroundColor: '#667eea'}}
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/teams')}
                style={{...buttonStyle, backgroundColor: '#6c757d'}}
              >
                View My Teams
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinTeam;
