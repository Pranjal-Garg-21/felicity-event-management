import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const TeamManagement = () => {
  const { user } = useContext(AuthContext);
  const [myTeams, setMyTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'invitations'

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const [teamsRes, invitesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/teams/my-teams', config),
        axios.get('http://localhost:5000/api/teams/invitations', config)
      ]);
      setMyTeams(teamsRes.data);
      setInvitations(invitesRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  const handleAcceptInvite = async (inviteCode) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(
        `http://localhost:5000/api/teams/join/${inviteCode}`,
        {},
        config
      );
      
      // Remove invitation from UI immediately
      setInvitations(prev => prev.filter(inv => inv.inviteCode !== inviteCode));
      
      alert(data.message);
      fetchData(); // Refresh all data
    } catch (err) {
      alert(err.response?.data?.message || 'Error accepting invitation');
    }
  };

  const handleDeclineInvite = async (inviteCode) => {
    const confirmed = window.confirm('Are you sure you want to decline this invitation?');
    if (!confirmed) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(
        `http://localhost:5000/api/teams/decline/${inviteCode}`,
        {},
        config
      );
      alert('Invitation declined');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error declining invitation');
    }
  };

  const handleCancelTeam = async (teamId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this team? All pending invitations will be revoked.'
    );
    if (!confirmed) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`http://localhost:5000/api/teams/cancel/${teamId}`, config);
      alert('Team cancelled successfully');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error cancelling team');
    }
  };

  const copyInviteLink = (inviteCode) => {
    const link = `${window.location.origin}/join-team/${inviteCode}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
        <p>Loading team data...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>👥 Team Management</h1>
        <p style={{ margin: 0, fontSize: '1.05rem', opacity: 0.9 }}>
          Manage your teams and invitations
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #eee' }}>
        <button
          onClick={() => setActiveTab('teams')}
          style={{
            padding: '12px 25px',
            background: activeTab === 'teams' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: activeTab === 'teams' ? 'white' : '#666',
            border: 'none',
            borderBottom: activeTab === 'teams' ? 'none' : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            transition: 'all 0.3s ease'
          }}
        >
          My Teams ({myTeams.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          style={{
            padding: '12px 25px',
            background: activeTab === 'invitations' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: activeTab === 'invitations' ? 'white' : '#666',
            border: 'none',
            borderBottom: activeTab === 'invitations' ? 'none' : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          Invitations ({invitations.length})
          {invitations.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              background: '#f44336',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: '700'
            }}>
              {invitations.length}
            </span>
          )}
        </button>
      </div>

      {/* My Teams Tab */}
      {activeTab === 'teams' && (
        <div>
          {myTeams.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              background: '#f9f9f9',
              borderRadius: '12px',
              border: '2px dashed #ddd'
            }}>
              <p style={{ fontSize: '2rem', margin: '0 0 15px 0' }}>👥</p>
              <p style={{ fontSize: '1.2rem', color: '#666', margin: '0 0 10px 0' }}>
                No teams yet
              </p>
              <p style={{ fontSize: '0.9rem', color: '#999' }}>
                Register for a team event to create or join a team
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {myTeams.map((team) => (
                <div
                  key={team._id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '25px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    border: team.status === 'Complete' ? '2px solid #4caf50' : '2px solid #ff9800'
                  }}
                >
                  {/* Team Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '1.3rem' }}>
                        {team.teamName}
                      </h3>
                      <p style={{ margin: '0 0 5px 0', color: '#667eea', fontSize: '0.9rem', fontWeight: '600' }}>
                        📅 {team.eventName}
                      </p>
                      <p style={{ margin: 0, color: '#999', fontSize: '0.85rem' }}>
                        {team.isLeader ? '👑 Team Leader' : '👤 Team Member'}
                      </p>
                    </div>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      background: team.status === 'Complete' ? '#e8f5e9' : team.status === 'Cancelled' ? '#ffebee' : '#fff3e0',
                      color: team.status === 'Complete' ? '#2e7d32' : team.status === 'Cancelled' ? '#c62828' : '#e65100'
                    }}>
                      {team.status === 'Complete' ? '✅ Complete' : team.status === 'Cancelled' ? '❌ Cancelled' : '⏳ Pending'}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div style={{
                    background: '#f9f9f9',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#555', fontSize: '0.95rem' }}>
                      Team Members ({team.members.filter(m => m.status === 'Accepted').length}/{team.teamSize})
                    </h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {team.members.map((member, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #eee'
                          }}
                        >
                          <div>
                            <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#333', fontSize: '0.9rem' }}>
                              {member.name}
                            </p>
                            <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>
                              {member.email}
                            </p>
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: member.status === 'Accepted' ? '#e8f5e9' : member.status === 'Declined' ? '#ffebee' : '#fff3e0',
                            color: member.status === 'Accepted' ? '#2e7d32' : member.status === 'Declined' ? '#c62828' : '#e65100'
                          }}>
                            {member.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invite Link (for leaders of pending teams) */}
                  {team.isLeader && team.status === 'Pending' && (
                    <div style={{
                      background: '#e3f2fd',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      border: '1px solid #90caf9'
                    }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: '600', color: '#1976d2' }}>
                        📋 Invite Code: <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{team.inviteCode}</span>
                      </p>
                      <button
                        onClick={() => copyInviteLink(team.inviteCode)}
                        style={{
                          padding: '8px 16px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}
                      >
                        📎 Copy Invite Link
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  {team.isLeader && team.status === 'Pending' && (
                    <button
                      onClick={() => handleCancelTeam(team._id)}
                      style={{
                        padding: '10px 20px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}
                    >
                      ✕ Cancel Team
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div>
          {invitations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              background: '#f9f9f9',
              borderRadius: '12px',
              border: '2px dashed #ddd'
            }}>
              <p style={{ fontSize: '2rem', margin: '0 0 15px 0' }}>📭</p>
              <p style={{ fontSize: '1.2rem', color: '#666', margin: '0 0 10px 0' }}>
                No pending invitations
              </p>
              <p style={{ fontSize: '0.9rem', color: '#999' }}>
                You'll see team invitations here when someone invites you
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {invitations.map((invite) => (
                <div
                  key={invite._id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '25px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    border: '2px solid #ff9800'
                  }}
                >
                  <div style={{ marginBottom: '15px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '1.3rem' }}>
                      {invite.teamName}
                    </h3>
                    <p style={{ margin: '0 0 5px 0', color: '#667eea', fontSize: '0.95rem', fontWeight: '600' }}>
                      📅 {invite.eventName}
                    </p>
                    <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9rem' }}>
                      👑 Team Leader: <strong>{invite.teamLeaderName}</strong>
                    </p>
                    <p style={{ margin: 0, color: '#999', fontSize: '0.85rem' }}>
                      Invited {new Date(invite.invitedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleAcceptInvite(invite.inviteCode)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
                      }}
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite.inviteCode)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#fff',
                        color: '#f44336',
                        border: '2px solid #f44336',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.95rem'
                      }}
                    >
                      ✕ Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
