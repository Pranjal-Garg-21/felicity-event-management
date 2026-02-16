import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DiscussionForum from '../components/DiscussionForum';

const ParticipantDashboard = () => {
  const { user, logout, login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [organizers, setOrganizers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null); // Changed from hoveredEventId
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [showProfile, setShowProfile] = useState(false); // For profile modal
  const [userProfile, setUserProfile] = useState(null); // Full user profile data
  const [activeTab, setActiveTab] = useState('home'); // Navigation tabs: home, events, clubs, myevents
  const [registeredEvents, setRegisteredEvents] = useState([]); // Events user has registered for
  const [myTickets, setMyTickets] = useState([]); // User's event tickets
  const [showTeamForm, setShowTeamForm] = useState(false); // Show team registration form
  const [customFormData, setCustomFormData] = useState({}); // Custom form field responses
  const [showRegistrationForm, setShowRegistrationForm] = useState(false); // Show custom registration form
  const [showDiscussionForum, setShowDiscussionForum] = useState(false); // Show discussion forum
  const [notifications, setNotifications] = useState([]); // User notifications
  const [teamFormData, setTeamFormData] = useState({
    teamName: '',
    pocName: '',
    pocEmail: '',
    members: [{ name: '', email: '' }] // Start with one member
  });

  // New invite-based team creation states
  const [showTeamCreateModal, setShowTeamCreateModal] = useState(false);
  const [teamCreateData, setTeamCreateData] = useState({
    teamName: '',
    teamSize: 2,
    memberEmails: ['']
  });

  // Check if onboarding is completed, redirect if not
  useEffect(() => {
    if (user && !user.hasCompletedOnboarding) {
      navigate('/onboarding');
    }
  }, [user, navigate]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get('http://localhost:5000/api/users/profile', config);
        setUserProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    
    if (user?.token) {
      fetchUserProfile();
    }
  }, [user]);

  // Fetch registered events and tickets
  useEffect(() => {
    const fetchRegisteredEventsAndTickets = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        
        // Fetch registered events and tickets separately so one failure doesn't block the other
        try {
          const eventsRes = await axios.get('http://localhost:5000/api/events/my-registrations', config);
          setRegisteredEvents(eventsRes.data);
        } catch (err) {
          console.error("Error fetching registered events:", err);
        }
        
        try {
          const ticketsRes = await axios.get('http://localhost:5000/api/users/my-tickets', config);
          setMyTickets(ticketsRes.data);
        } catch (err) {
          console.error("Error fetching tickets:", err);
        }
      } catch (err) {
        console.error("Error fetching registered events/tickets:", err);
      }
    };
    
    if (user?.token) {
      fetchRegisteredEventsAndTickets();
    }
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get('http://localhost:5000/api/users/notifications', config);
        setNotifications(data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    
    if (user?.token) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch both Events and Organizers on mount
 useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { 
        headers: { Authorization: `Bearer ${user.token}` }, 
        params: { search: searchTerm } // Send search term to backend
      };
      
      const [eventRes, orgRes, profileRes] = await Promise.all([
        axios.get('http://localhost:5000/api/events/all', config),
        axios.get('http://localhost:5000/api/users/organizers', config),
        axios.get('http://localhost:5000/api/users/profile', config)
      ]);

      const userInterests = profileRes.data.interests || [];
      const followedClubIds = (profileRes.data.followedClubs || []).map(club => 
        typeof club === 'string' ? club : club._id
      );

      // Filter out Draft events - participants should only see Published, Ongoing, or Closed events
      const visibleEvents = eventRes.data.filter(event => 
        event.status !== 'Draft' && event.status !== undefined
      );

      // Advanced sorting algorithm based on multiple factors
      const sortedEvents = visibleEvents.sort((a, b) => {
        // Factor 1: Event category matches user interests (highest priority)
        const aCategoryMatch = userInterests.some(interest => 
          a.category?.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(a.category?.toLowerCase())
        );
        const bCategoryMatch = userInterests.some(interest => 
          b.category?.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(b.category?.toLowerCase())
        );

        // Factor 2: Event name matches user interests
        const aNameMatch = userInterests.some(interest => 
          a.name?.toLowerCase().includes(interest.toLowerCase())
        );
        const bNameMatch = userInterests.some(interest => 
          b.name?.toLowerCase().includes(interest.toLowerCase())
        );

        // Factor 3: Event from followed club
        const aFromFollowedClub = followedClubIds.includes(a.organizer?._id || a.organizer);
        const bFromFollowedClub = followedClubIds.includes(b.organizer?._id || b.organizer);

        // Factor 4: Event tags match user interests
        const aTagMatches = a.tags?.filter(tag => 
          userInterests.some(interest => interest.toLowerCase() === tag.toLowerCase())
        ).length || 0;
        const bTagMatches = b.tags?.filter(tag => 
          userInterests.some(interest => interest.toLowerCase() === tag.toLowerCase())
        ).length || 0;

        // Calculate total relevance score for each event
        const aScore = (
          (aCategoryMatch ? 100 : 0) +
          (aNameMatch ? 50 : 0) +
          (aFromFollowedClub ? 75 : 0) +
          (aTagMatches * 25)
        );

        const bScore = (
          (bCategoryMatch ? 100 : 0) +
          (bNameMatch ? 50 : 0) +
          (bFromFollowedClub ? 75 : 0) +
          (bTagMatches * 25)
        );

        // Sort by relevance score (descending)
        if (bScore !== aScore) {
          return bScore - aScore;
        }

        // If same score, sort by date (upcoming events first)
        return new Date(a.startDate) - new Date(b.startDate);
      });

      // Sort organizers based on user interests and followed status
      const sortedOrganizers = orgRes.data.sort((a, b) => {
        // Factor 1: Already following (show first)
        const aFollowed = followedClubIds.includes(a._id);
        const bFollowed = followedClubIds.includes(b._id);
        
        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;

        // Factor 2: Category matches user interests
        const aCategoryMatch = userInterests.some(interest => 
          a.category?.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(a.category?.toLowerCase())
        );
        const bCategoryMatch = userInterests.some(interest => 
          b.category?.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(b.category?.toLowerCase())
        );

        if (aCategoryMatch && !bCategoryMatch) return -1;
        if (!aCategoryMatch && bCategoryMatch) return 1;

        // Factor 3: Club name matches user interests
        const aNameMatch = userInterests.some(interest => 
          a.organizerName?.toLowerCase().includes(interest.toLowerCase())
        );
        const bNameMatch = userInterests.some(interest => 
          b.organizerName?.toLowerCase().includes(interest.toLowerCase())
        );

        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;

        // Factor 4: Sort by follower count (popularity)
        return (b.followers?.length || 0) - (a.followers?.length || 0);
      });

      setEvents(sortedEvents);
      setOrganizers(sortedOrganizers);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  // Debouncing logic: Only search DB if term is empty or 3+ characters
  // This prevents hitting the database on every single keystroke
  if (searchTerm.length === 0 || searchTerm.length >= 3) {
    const delayDebounceFn = setTimeout(() => {
      if (user?.token) fetchData();
    }, 300); // 300ms delay

    return () => clearTimeout(delayDebounceFn);
  }
}, [searchTerm, user]);

  // Handle Follow/Unfollow Toggle
  const handleFollow = async (orgId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      // Sending follow/unfollow request to backend
      await axios.post(`http://localhost:5000/api/users/follow/${orgId}`, {}, config);
      
      // Refresh user profile to sync followed clubs
      const profileRes = await axios.get('http://localhost:5000/api/users/profile', config);
      setUserProfile(profileRes.data);
      
      // Update user context with new followedClubs
      const clubIds = profileRes.data.followedClubs.map(club => 
        typeof club === 'string' ? club : club._id
      );
      login({ ...user, followedClubs: clubIds });
      
      // Refresh organizers list to get updated followers count
      const orgRes = await axios.get('http://localhost:5000/api/users/organizers', config);
      setOrganizers(orgRes.data);
      
      console.log('Updated followed clubs:', clubIds);
    } catch (err) {
      console.error('Follow error:', err);
      alert("Could not update follow status. Ensure User routes are properly linked.");
    }
  };

  // Handle Event Registration
  const handleRegister = async (event) => {
    // For team events, show the NEW invite-based team creation modal
    if (event.type === 'Team') {
      const minSize = event.teamDetails?.minTeamSize || 2;
      const maxSize = event.teamDetails?.maxTeamSize || 4;
      
      // Reset team creation form
      setTeamCreateData({
        teamName: '',
        teamSize: minSize,
        memberEmails: Array(minSize - 1).fill('') // -1 because leader is auto-included
      });
      setCustomFormData({}); // Reset custom form data
      setShowTeamCreateModal(true);
      return;
    }

    // If event has custom fields, show the registration form first
    if (event.customFields && event.customFields.length > 0 && !showRegistrationForm) {
      setCustomFormData({});
      setShowRegistrationForm(true);
      return;
    }

    // Show confirmation dialog for individual/merchandise events
    const eventType = event.type === 'Merchandise' ? 'purchase this merchandise' : 'register for this event';
    const fee = event.registrationFee > 0 ? `\nRegistration Fee: ₹${event.registrationFee}` : '\nThis is a free event';
    
    const confirmed = window.confirm(
      `Are you sure you want to ${eventType}?\n\nEvent: ${event.name}${fee}\n\nClick OK to confirm.`
    );
    
    if (!confirmed) return;

    // Validate required custom fields
    if (event.customFields && event.customFields.length > 0) {
      for (const field of event.customFields) {
        if (field.isRequired) {
          const value = customFormData[field.fieldName];
          if (value === undefined || value === null || value === '') {
            alert(`Please fill in the required field: "${field.fieldName}"`);
            return;
          }
        }
      }
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`http://localhost:5000/api/events/register/${event._id}`, {
        formResponses: customFormData
      }, config);
      
      // Show success message with ticket info
      let successMessage = `✅ ${data.message}\n\n📅 Event: ${data.event.eventName}\n🎭 Organizer: ${data.event.organizer}`;
      
      if (data.ticket && data.ticket.ticketId) {
        successMessage += `\n\n🎟️ Ticket ID: ${data.ticket.ticketId}\n📧 Ticket sent to your email!`;
      }
      
      alert(successMessage);
      
      setSelectedEvent(null); // Close modal after registration
      setShowRegistrationForm(false);
      setCustomFormData({});
      
      // Refresh events to update participant count - filter out drafts
      const eventRes = await axios.get('http://localhost:5000/api/events/all', config);
      const visibleEvents = eventRes.data.filter(ev => ev.status !== 'Draft' && ev.status !== undefined);
      setEvents(visibleEvents);
      
      // Refresh registered events and tickets list separately so one failure doesn't block the other
      try {
        const registeredRes = await axios.get('http://localhost:5000/api/events/my-registrations', config);
        setRegisteredEvents(registeredRes.data);
      } catch (regErr) {
        console.error("Error refreshing registered events:", regErr);
      }
      
      try {
        const ticketsRes = await axios.get('http://localhost:5000/api/users/my-tickets', config);
        setMyTickets(ticketsRes.data);
      } catch (tickErr) {
        console.error("Error refreshing tickets:", tickErr);
      }
      
    } catch (err) {
      alert(`❌ Registration Failed\n\n${err.response?.data?.message || "An error occurred. Please try again."}`);
    }
  };

  // Handle Event Unregistration (only for free events before deadline)
  const handleUnregister = async (event) => {
    // Double-check: only free events
    if (event.registrationFee > 0) {
      alert("❌ Cannot unregister from paid events. Please contact the organizer.");
      return;
    }

    // Check deadline
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      alert("❌ Cannot unregister after the registration deadline has passed.");
      return;
    }

    const teamNote = event.type === 'Team' 
      ? '\n\n⚠️ As the POC, this will unregister ALL team members from this event.' 
      : '';

    const confirmed = window.confirm(
      `Are you sure you want to unregister from "${event.name}"?${teamNote}\n\nClick OK to confirm.`
    );

    if (!confirmed) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`http://localhost:5000/api/events/unregister/${event._id}`, {}, config);

      alert(`✅ ${data.message}`);
      setSelectedEvent(null);

      // Refresh all data
      const eventRes = await axios.get('http://localhost:5000/api/events/all', config);
      const visibleEvents = eventRes.data.filter(ev => ev.status !== 'Draft' && ev.status !== undefined);
      setEvents(visibleEvents);

      try {
        const registeredRes = await axios.get('http://localhost:5000/api/events/my-registrations', config);
        setRegisteredEvents(registeredRes.data);
      } catch (regErr) {
        console.error("Error refreshing registered events:", regErr);
      }

      try {
        const ticketsRes = await axios.get('http://localhost:5000/api/users/my-tickets', config);
        setMyTickets(ticketsRes.data);
      } catch (tickErr) {
        console.error("Error refreshing tickets:", tickErr);
      }
    } catch (err) {
      alert(`❌ Unregistration Failed\n\n${err.response?.data?.message || "An error occurred. Please try again."}`);
    }
  };

  // Check if an event is eligible for unregistration
  const canUnregister = (event) => {
    if (!event) return false;
    // Only free events
    if (event.registrationFee > 0) return false;
    // Only before deadline
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) return false;
    // Must be registered
    if (!registeredEvents.some(e => e._id === event._id)) return false;
    return true;
  };

  // Handle Team Registration
  const handleTeamRegister = async () => {
    if (!selectedEvent) return;

    // Validation
    const minSize = selectedEvent.teamDetails?.minTeamSize || 2;
    const maxSize = selectedEvent.teamDetails?.maxTeamSize || 4;
    
    if (teamFormData.members.length < minSize || teamFormData.members.length > maxSize) {
      alert(`Team size must be between ${minSize} and ${maxSize} members.`);
      return;
    }

    if (!teamFormData.teamName || !teamFormData.pocName || !teamFormData.pocEmail) {
      alert('Please fill in all required fields.');
      return;
    }

    // Check if all members have name and email
    for (let member of teamFormData.members) {
      if (!member.name || !member.email) {
        alert('Please fill in name and email for all team members.');
        return;
      }
    }

    // Validate required custom fields
    if (selectedEvent.customFields && selectedEvent.customFields.length > 0) {
      for (const field of selectedEvent.customFields) {
        if (field.isRequired) {
          const value = customFormData[field.fieldName];
          if (value === undefined || value === null || value === '') {
            alert(`Please fill in the required field: "${field.fieldName}"`);
            return;
          }
        }
      }
    }

    const totalFee = teamFormData.members.length * selectedEvent.registrationFee;
    
    const confirmed = window.confirm(
      `Team Registration Confirmation\n\nTeam: ${teamFormData.teamName}\nMembers: ${teamFormData.members.length}\nTotal Fee: ₹${totalFee}\n\nProceed with registration?`
    );

    if (!confirmed) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`http://localhost:5000/api/events/register-team/${selectedEvent._id}`, {
        ...teamFormData,
        totalFee,
        formResponses: customFormData
      }, config);
      
      alert(`✅ Team Registration Successful!\n\nTeam: ${teamFormData.teamName}\nTotal Fee: ₹${totalFee}`);
      
      // Reset form and close modals
      setTeamFormData({
        teamName: '',
        pocName: '',
        pocEmail: '',
        members: [{ name: '', email: '' }]
      });
      setCustomFormData({});
      setShowTeamForm(false);
      setSelectedEvent(null);
      
      // Refresh events - filter out drafts
      const eventRes = await axios.get('http://localhost:5000/api/events/all', config);
      const visibleEvents = eventRes.data.filter(ev => ev.status !== 'Draft' && ev.status !== undefined);
      setEvents(visibleEvents);
      
      // Also refresh registered events and tickets
      try {
        const registeredRes = await axios.get('http://localhost:5000/api/events/my-registrations', config);
        setRegisteredEvents(registeredRes.data);
      } catch (regErr) {
        console.error("Error refreshing registered events:", regErr);
      }
      
      try {
        const ticketsRes = await axios.get('http://localhost:5000/api/users/my-tickets', config);
        setMyTickets(ticketsRes.data);
      } catch (tickErr) {
        console.error("Error refreshing tickets:", tickErr);
      }
      
    } catch (err) {
      alert(`❌ Team Registration Failed\n\n${err.response?.data?.message || "An error occurred. Please try again."}`);
    }
  };

  // NEW: Handle Team Creation with Invite System
  const handleCreateTeam = async () => {
    if (!selectedEvent) return;

    // Validation
    if (!teamCreateData.teamName.trim()) {
      alert('Please enter a team name');
      return;
    }

    const validEmails = teamCreateData.memberEmails.filter(e => e.trim() && e.includes('@'));
    if (validEmails.length !== teamCreateData.teamSize) {
      alert(`Please provide exactly ${teamCreateData.teamSize} member email(s) to match the team size`);
      return;
    }

    // Check for custom form fields
    if (selectedEvent.customFields && selectedEvent.customFields.length > 0) {
      const hasRequired = selectedEvent.customFields.some(f => f.isRequired);
      if (hasRequired) {
        for (const field of selectedEvent.customFields) {
          if (field.isRequired && !customFormData[field.fieldName]) {
            alert(`Please fill in required field: ${field.fieldName}`);
            return;
          }
        }
      }
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(
        `http://localhost:5000/api/teams/create/${selectedEvent._id}`,
        {
          teamName: teamCreateData.teamName,
          teamSize: parseInt(teamCreateData.teamSize),
          memberEmails: validEmails,
          formResponses: customFormData // Include custom form responses
        },
        config
      );

      // Copy invite link to clipboard
      if (navigator.clipboard && data.inviteLink) {
        navigator.clipboard.writeText(data.inviteLink);
      }

      alert(
        `✅ Team Created Successfully!\n\n` +
        `📋 Invite Code: ${data.inviteCode}\n\n` +
        `🔗 Invite link copied to clipboard!\n\n` +
        `Share it with your team members so they can join.\n\n` +
        `You can view your team status in the "My Teams" section.`
      );

      setShowTeamCreateModal(false);
      setSelectedEvent(null);
      setCustomFormData({});

      // Refresh events
      const eventRes = await axios.get('http://localhost:5000/api/events/all', config);
      const visibleEvents = eventRes.data.filter(ev => ev.status !== 'Draft' && ev.status !== undefined);
      setEvents(visibleEvents);

    } catch (err) {
      console.error('Team creation error:', err);
      alert(err.response?.data?.message || 'Error creating team');
    }
  };

  // Team creation form helpers
  const addTeamEmailField = () => {
    const maxSize = selectedEvent?.teamDetails?.maxTeamSize || 4;
    if (teamCreateData.memberEmails.length < maxSize - 1) {
      setTeamCreateData({
        ...teamCreateData,
        memberEmails: [...teamCreateData.memberEmails, '']
      });
    } else {
      alert(`Maximum team size is ${maxSize} members (including you as the leader)`);
    }
  };

  const updateTeamEmail = (index, value) => {
    const newEmails = [...teamCreateData.memberEmails];
    newEmails[index] = value;
    setTeamCreateData({ ...teamCreateData, memberEmails: newEmails });
  };

  const removeTeamEmailField = (index) => {
    if (teamCreateData.memberEmails.length > 1) {
      setTeamCreateData({
        ...teamCreateData,
        memberEmails: teamCreateData.memberEmails.filter((_, i) => i !== index)
      });
    }
  };

  // Add/Remove team members (OLD system - keeping for backward compatibility)
  const addTeamMember = () => {
    const maxSize = selectedEvent?.teamDetails?.maxTeamSize || 4;
    if (teamFormData.members.length < maxSize) {
      setTeamFormData({
        ...teamFormData,
        members: [...teamFormData.members, { name: '', email: '' }]
      });
    } else {
      alert(`Maximum team size is ${maxSize} members.`);
    }
  };

  const removeTeamMember = (index) => {
    const minSize = selectedEvent?.teamDetails?.minTeamSize || 2;
    if (teamFormData.members.length > 1) {
      const newMembers = teamFormData.members.filter((_, i) => i !== index);
      setTeamFormData({ ...teamFormData, members: newMembers });
    } else {
      alert(`Minimum team size is ${minSize} member.`);
    }
  };

  const updateTeamMember = (index, field, value) => {
    const newMembers = [...teamFormData.members];
    newMembers[index][field] = value;
    setTeamFormData({ ...teamFormData, members: newMembers });
  };

  // Notification handlers
  const handleMarkNotificationRead = async (notificationId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`http://localhost:5000/api/users/notifications/${notificationId}/read`, {}, config);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`http://localhost:5000/api/users/notifications/${notificationId}`, config);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) handleMarkNotificationRead(notification._id);
    if (notification.eventId) {
      const event = registeredEvents.find(e => e._id === notification.eventId);
      if (event) {
        setSelectedEvent(event);
        setShowDiscussionForum(true);
      }
    }
  };
  
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={containerStyle}>
      {/* Top Navigation Bar */}
      <nav style={navStyle}>
        <div style={navBrandStyle}>
          <span style={navIconStyle}>🎓</span>
          <h2 style={navTitleStyle}>Participant Portal</h2>
        </div>
        
        {/* Navigation Menu */}
        <div style={navMenuStyle}>
          <button 
            onClick={() => setActiveTab('home')} 
            style={activeTab === 'home' ? activeNavButtonStyle : navButtonStyle}
          >
            🏠 Home
          </button>
          <button 
            onClick={() => setActiveTab('events')} 
            style={activeTab === 'events' ? activeNavButtonStyle : navButtonStyle}
          >
            🎭 All Events
          </button>
          <button 
            onClick={() => setActiveTab('clubs')} 
            style={activeTab === 'clubs' ? activeNavButtonStyle : navButtonStyle}
          >
            🏢 Clubs
          </button>
          <button 
            onClick={() => {
              setActiveTab('myevents');
              // Refresh registered events when switching to My Events tab
              const config = { headers: { Authorization: `Bearer ${user.token}` } };
              axios.get('http://localhost:5000/api/events/my-registrations', config)
                .then(res => setRegisteredEvents(res.data))
                .catch(err => console.error("Error refreshing registered events:", err));
              axios.get('http://localhost:5000/api/users/my-tickets', config)
                .then(res => setMyTickets(res.data))
                .catch(err => console.error("Error refreshing tickets:", err));
            }} 
            style={activeTab === 'myevents' ? activeNavButtonStyle : navButtonStyle}
          >
            📋 My Events
            {registeredEvents.length > 0 && (
              <span style={badgeStyle}>{registeredEvents.length}</span>
            )}
          </button>
          <button 
            onClick={() => navigate('/teams')} 
            style={navButtonStyle}
          >
            👥 My Teams
          </button>
          <button 
            onClick={() => setActiveTab('announcements')} 
            style={activeTab === 'announcements' ? activeNavButtonStyle : navButtonStyle}
          >
            📢 Announcements
            {notifications.filter(n => !n.read).length > 0 && (
              <span style={badgeStyle}>{notifications.filter(n => !n.read).length}</span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Profile Button */}
          <button 
            onClick={() => setShowProfile(!showProfile)} 
            style={profileButtonStyle}
          >
            <span style={{ fontSize: '18px', marginRight: '8px' }}>👤</span>
            {user?.firstName || 'Profile'}
          </button>
          <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>
        </div>
      </nav>

      {/* Profile Modal */}
      {showProfile && userProfile && (
        <div style={profileModalOverlayStyle} onClick={() => setShowProfile(false)}>
          <div style={profileModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={profileHeaderStyle}>
              <div style={profileAvatarStyle}>
                {userProfile.firstName?.[0]}{userProfile.lastName?.[0]}
              </div>
              <h2 style={{ margin: '10px 0 5px 0', color: 'white' }}>
                {userProfile.firstName} {userProfile.lastName}
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>{userProfile.email}</p>
            </div>

            <div style={profileBodyStyle}>
              <div style={profileSectionStyle}>
                <h3 style={profileSectionTitleStyle}>📱 Contact Information</h3>
                <p style={profileInfoTextStyle}>
                  <strong>Phone:</strong> {userProfile.contactNumber || 'Not provided'}
                </p>
                <p style={profileInfoTextStyle}>
                  <strong>College:</strong> {userProfile.collegeName || 'Not provided'}
                </p>
                <p style={profileInfoTextStyle}>
                  <strong>Type:</strong> {userProfile.participantType || 'Not specified'}
                </p>
              </div>

              <div style={profileSectionStyle}>
                <h3 style={profileSectionTitleStyle}>🎨 Areas of Interest</h3>
                {userProfile.interests && userProfile.interests.length > 0 ? (
                  <div style={interestTagsContainerStyle}>
                    {userProfile.interests.map((interest, idx) => (
                      <span key={idx} style={interestTagStyle}>{interest}</span>
                    ))}
                  </div>
                ) : (
                  <p style={profileInfoTextStyle}>No interests selected</p>
                )}
              </div>

              <div style={profileSectionStyle}>
                <h3 style={profileSectionTitleStyle}>🏢 Followed Clubs</h3>
                {userProfile.followedClubs && userProfile.followedClubs.length > 0 ? (
                  <div style={followedClubsListStyle}>
                    {userProfile.followedClubs.map((club) => (
                      <div key={club._id} style={clubItemStyle}>
                        <span style={{ fontSize: '18px' }}>🏛️</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>
                            {club.organizerName}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                            {club.category}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={profileInfoTextStyle}>Not following any clubs yet</p>
                )}
              </div>

              <div style={profileSectionStyle}>
                <h3 style={profileSectionTitleStyle}>🔒 Account Security</h3>
                <p style={profileInfoTextStyle}>
                  <strong>Password:</strong> ••••••••
                </p>
                <button style={editProfileButtonStyle} onClick={() => navigate('/onboarding')}>
                  ✏️ Edit Interests & Clubs
                </button>
              </div>
            </div>

            <button style={closeProfileButtonStyle} onClick={() => setShowProfile(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div style={contentStyle}>
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <>
            <div style={welcomeBoxStyle}>
              <h1 style={headingStyle}>Welcome, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Participant'}! 👋</h1>
              <p style={subtitleStyle}>Explore events and follow your favorite clubs</p>
              <div style={searchContainerStyle}>
                <span style={searchIconStyle}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search for clubs, events, or categories..." 
                  style={searchInputStyle}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Section 9.7: Clubs / Organizers Listing */}
            <h2 style={sectionHeaderStyle}>🏢 Explore Clubs</h2>
            <div style={cardGridStyle}>
              {loading ? <p>Loading Clubs...</p> : (
                organizers.length > 0 ? organizers.slice(0, 6).map(org => (
                  <div key={org._id} style={infoCardStyle}>
                    <div style={cardIconStyle}>🏛️</div>
                    <h3 style={cardTitleStyle}>{org.organizerName}</h3>
                    <p style={{ color: '#764ba2', fontWeight: 'bold', fontSize: '0.9rem' }}>{org.category}</p>
                    <p style={cardDescStyle}>{org.description || "No description provided."}</p>
                    
                    {/* Follow/Unfollow Button Logic */}
                    <button 
                      onClick={() => handleFollow(org._id)}
                      style={
                        (org.followers?.some(id => id.toString() === user._id.toString()) || 
                         user.followedClubs?.some(id => id.toString() === org._id.toString()))
                        ? unfollowBtnStyle : followBtnStyle
                      }
                    >
                      {(org.followers?.some(id => id.toString() === user._id.toString()) || 
                        user.followedClubs?.some(id => id.toString() === org._id.toString()))
                       ? 'Unfollow' : 'Follow'}
                    </button>
                  </div>
                )) : <p>No organizers found.</p>
              )}
            </div>
            <button 
              onClick={() => setActiveTab('clubs')} 
              style={{...cardButtonStyle, marginTop: '20px', padding: '12px 30px'}}
            >
              View All Clubs →
            </button>
          </>
        )}

        {/* ALL EVENTS TAB */}
        {activeTab === 'events' && (
          <>
            <div style={welcomeBoxStyle}>
              <h1 style={headingStyle}>🎭 All Festival Events</h1>
              <p style={subtitleStyle}>
                {userProfile?.interests?.length > 0 
                  ? '✨ Sorted based on your interests' 
                  : 'Browse all available events'}
              </p>
              <div style={searchContainerStyle}>
                <span style={searchIconStyle}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search for events..." 
                  style={searchInputStyle}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div style={cardGridStyle}>
              {loading ? <p>Loading Events...</p> : (
                events.length > 0 ? events.map((event, index) => {
                  // Calculate if event is recommended
                  const userInterests = userProfile?.interests || [];
                  const followedClubIds = (userProfile?.followedClubs || []).map(club => 
                    typeof club === 'string' ? club : club._id
                  );

                  const categoryMatch = userInterests.some(interest => 
                    event.category?.toLowerCase().includes(interest.toLowerCase())
                  );
                  const nameMatch = userInterests.some(interest => 
                    event.name?.toLowerCase().includes(interest.toLowerCase())
                  );
                  const fromFollowedClub = followedClubIds.includes(event.organizer?._id || event.organizer);
                  const tagMatch = event.tags?.some(tag => 
                    userInterests.some(interest => interest.toLowerCase() === tag.toLowerCase())
                  );

                  const isRecommended = categoryMatch || nameMatch || fromFollowedClub || tagMatch;
                  const isTopPick = index < 3 && isRecommended;
                  const isRegistered = registeredEvents.some(e => e._id === event._id);

                  return (
                    <div 
                      key={event._id} 
                      style={{
                        ...infoCardStyle,
                        cursor: 'pointer',
                        border: isTopPick ? '3px solid #667eea' : (isRegistered ? '2px solid #4caf50' : 'none'),
                        boxShadow: isTopPick ? '0 15px 40px rgba(102, 126, 234, 0.3)' : '0 10px 30px rgba(0,0,0,0.1)'
                      }} 
                      onClick={() => setSelectedEvent(event)}
                    >
                      {isRegistered && <div style={{...topPickBadgeStyle, background: '#4caf50'}}>✓ Registered</div>}
                      {isTopPick && !isRegistered && <div style={topPickBadgeStyle}>⭐ Top Pick</div>}
                      {fromFollowedClub && !isTopPick && !isRegistered && <div style={recommendedBadgeStyle}>💜 From Followed Club</div>}
                      {categoryMatch && !fromFollowedClub && !isTopPick && !isRegistered && <div style={recommendedBadgeStyle}>✨ Matches Your Interest</div>}

                      <div style={cardIconStyle}>{event.type === 'Merchandise' ? '👕' : '📅'}</div>
                      <h3 style={cardTitleStyle}>{event.name}</h3>
                      <div style={dateTimeStyle}>
                        <p>📅 {new Date(event.startDate).toLocaleDateString()}</p>
                        <p>🕒 {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <button 
                        style={cardButtonStyle} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  );
                }) : <p>No events found.</p>
              )}
            </div>
          </>
        )}

        {/* CLUBS TAB */}
        {activeTab === 'clubs' && (
          <>
            <div style={welcomeBoxStyle}>
              <h1 style={headingStyle}>🏢 All Clubs</h1>
              <p style={subtitleStyle}>
                {userProfile?.followedClubs?.length > 0 
                  ? 'Your followed clubs appear first' 
                  : 'Discover and follow clubs'}
              </p>
              <div style={searchContainerStyle}>
                <span style={searchIconStyle}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search for clubs..." 
                  style={searchInputStyle}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div style={cardGridStyle}>
              {loading ? <p>Loading Clubs...</p> : (
                organizers.length > 0 ? organizers.map(org => (
                  <div key={org._id} style={infoCardStyle}>
                    <div style={cardIconStyle}>🏛️</div>
                    <h3 style={cardTitleStyle}>{org.organizerName}</h3>
                    <p style={{ color: '#764ba2', fontWeight: 'bold', fontSize: '0.9rem' }}>{org.category}</p>
                    <p style={cardDescStyle}>{org.description || "No description provided."}</p>
                    
                    {/* Follow/Unfollow Button Logic */}
                    <button 
                      onClick={() => handleFollow(org._id)}
                      style={
                        (org.followers?.some(id => id.toString() === user._id.toString()) || 
                         user.followedClubs?.some(id => id.toString() === org._id.toString()))
                        ? unfollowBtnStyle : followBtnStyle
                      }
                    >
                      {(org.followers?.some(id => id.toString() === user._id.toString()) || 
                        user.followedClubs?.some(id => id.toString() === org._id.toString()))
                       ? 'Unfollow' : 'Follow'}
                    </button>
                  </div>
                )) : <p>No organizers found.</p>
              )}
            </div>
          </>
        )}

        {/* MY EVENTS TAB */}
        {activeTab === 'myevents' && (
          <>
            <div style={welcomeBoxStyle}>
              <h1 style={headingStyle}>📋 My Registered Events & Tickets</h1>
              <p style={subtitleStyle}>
                {registeredEvents.length > 0 
                  ? `You're registered for ${registeredEvents.length} event${registeredEvents.length > 1 ? 's' : ''} | ${myTickets.length} ticket${myTickets.length !== 1 ? 's' : ''} issued` 
                  : 'You haven\'t registered for any events yet'}
              </p>
            </div>

            <div style={cardGridStyle}>
              {registeredEvents.length > 0 ? registeredEvents.map((event) => {
                // Find ticket for this event
                const ticket = myTickets.find(t => t.eventId && t.eventId._id === event._id);
                
                return (
                <div 
                  key={event._id} 
                  style={{
                    ...infoCardStyle,
                    cursor: 'pointer',
                    border: '2px solid #4caf50',
                    background: 'linear-gradient(135deg, #f5fff5 0%, #ffffff 100%)'
                  }} 
                  onClick={() => setSelectedEvent(event)}
                >
                  <div style={registeredBadgeStyle}>✓ Registered</div>
                  {ticket && ticket.emailSent && (
                    <div style={{...registeredBadgeStyle, background: '#2196F3', right: '70px', left: 'auto'}}>
                      📧 Ticket Sent
                    </div>
                  )}
                  <div style={cardIconStyle}>{event.type === 'Merchandise' ? '👕' : '📅'}</div>
                  <h3 style={cardTitleStyle}>{event.name}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#667eea', fontWeight: '600', marginBottom: '10px' }}>
                    🎭 {event.organizer?.organizerName || 'Organizer'}
                  </p>
                  <div style={dateTimeStyle}>
                    <p>📅 <strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()}</p>
                    <p>🕒 <strong>Time:</strong> {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {ticket && (
                    <div style={{
                      background: '#e3f2fd',
                      padding: '10px',
                      borderRadius: '8px',
                      marginTop: '10px',
                      border: '1px solid #90caf9'
                    }}>
                      <p style={{ fontSize: '0.75rem', color: '#1976d2', margin: '0', fontWeight: '600', textAlign: 'center', fontFamily: 'monospace' }}>
                        🎟️ {ticket.ticketId}
                      </p>
                    </div>
                  )}
                  <button 
                    style={{...cardButtonStyle, background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', marginTop: '10px'}} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                    }}
                  >
                    View Details
                  </button>
                  <button 
                    style={{...cardButtonStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', marginTop: '8px', fontSize: '0.85rem'}} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                      setShowDiscussionForum(true);
                    }}
                  >
                    💬 Discussion
                  </button>
                  {canUnregister(event) && (
                    <button 
                      style={{
                        ...cardButtonStyle, 
                        background: 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)', 
                        marginTop: '8px',
                        fontSize: '0.85rem'
                      }} 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnregister(event);
                      }}
                    >
                      ✕ Unregister
                    </button>
                  )}
                </div>
                );
              }) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                  <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '20px' }}>
                    No events registered yet. Start exploring!
                  </p>
                  <button 
                    onClick={() => setActiveTab('events')} 
                    style={{...cardButtonStyle, padding: '12px 30px'}}
                  >
                    Browse Events →
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <>
            <div style={welcomeBoxStyle}>
              <h1 style={headingStyle}>📢 Announcements</h1>
              <p style={subtitleStyle}>
                {notifications.filter(n => !n.read).length > 0 
                  ? `You have ${notifications.filter(n => !n.read).length} unread announcement${notifications.filter(n => !n.read).length > 1 ? 's' : ''}`
                  : 'All caught up! No new announcements'}
              </p>
            </div>

            <div style={{maxWidth: '900px', margin: '0 auto'}}>
              {notifications.length === 0 ? (
                <div style={{textAlign: 'center', padding: '60px 20px'}}>
                  <div style={{fontSize: '4rem', marginBottom: '20px'}}>📭</div>
                  <h2 style={{color: '#666', marginBottom: '10px'}}>No announcements yet</h2>
                  <p style={{color: '#999', fontSize: '1rem'}}>
                    You'll see announcements from organizers of your registered events here
                  </p>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  {notifications.map(notification => (
                    <div 
                      key={notification._id} 
                      style={{
                        background: 'white',
                        borderRadius: '15px',
                        padding: '25px',
                        boxShadow: notification.read ? '0 4px 15px rgba(0,0,0,0.08)' : '0 10px 30px rgba(102, 126, 234, 0.2)',
                        border: `3px solid ${notification.read ? '#e0e7ff' : '#667eea'}`,
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <div style={{
                            background: notification.read ? '#e0e7ff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: notification.read ? '#667eea' : 'white',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold'
                          }}>
                            📢
                          </div>
                          <div>
                            <h3 style={{
                              margin: '0 0 5px 0', 
                              color: notification.read ? '#666' : '#333',
                              fontSize: '1.3rem',
                              fontWeight: '700'
                            }}>
                              {notification.eventName}
                            </h3>
                            <p style={{
                              margin: 0,
                              fontSize: '0.85rem',
                              color: '#999',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span>🕒</span>
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })} at {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                            </p>
                          </div>
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                          {!notification.read && (
                            <span style={{
                              background: '#f5576c',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              NEW
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification._id);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f5576c',
                              fontSize: '1.5rem',
                              cursor: 'pointer',
                              padding: '0',
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(245, 87, 108, 0.1)'}
                            onMouseOut={(e) => e.target.style.background = 'transparent'}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div style={{
                        background: '#f8f9ff',
                        padding: '20px',
                        borderRadius: '10px',
                        marginBottom: '15px'
                      }}>
                        <p style={{
                          margin: 0,
                          color: '#333',
                          fontSize: '1rem',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {notification.content}
                        </p>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <p style={{margin: 0, fontSize: '0.85rem', color: '#999'}}>
                          Click to view full announcement in Discussion Forum
                        </p>
                        <span style={{fontSize: '1.2rem'}}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Event Details Modal */}
        {selectedEvent && (
          <div style={modalOverlayStyle} onClick={() => { setSelectedEvent(null); setShowRegistrationForm(false); setCustomFormData({}); }}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <button style={closeButtonStyle} onClick={() => { setSelectedEvent(null); setShowRegistrationForm(false); setCustomFormData({}); }}>✕</button>
              
              <div style={modalHeaderStyle}>
                <div style={modalIconStyle}>{selectedEvent.type === 'Merchandise' ? '👕' : '📅'}</div>
                <h2 style={modalTitleStyle}>{selectedEvent.name}</h2>
              </div>

              <div style={modalBodyStyle}>
                <div style={modalSectionStyle}>
                  <span style={modalLabelStyle}>📝 Description</span>
                  <p style={modalTextStyle}>{selectedEvent.description || 'No description available'}</p>
                </div>

                <div style={modalSectionStyle}>
                  <span style={modalLabelStyle}>🎭 Organizer</span>
                  <p style={modalTextStyle}>
                    {typeof selectedEvent.organizer === 'object' 
                      ? (selectedEvent.organizer.organizerName || selectedEvent.organizer.name || 'Unknown Organizer')
                      : selectedEvent.organizer
                    }
                  </p>
                </div>

                <div style={modalInfoGridStyle}>
                  <div style={modalInfoItemStyle}>
                    <span style={modalLabelStyle}>� Start Date</span>
                    <p style={modalTextStyle}>{new Date(selectedEvent.startDate).toLocaleDateString()}</p>
                  </div>
                  <div style={modalInfoItemStyle}>
                    <span style={modalLabelStyle}>⏰ Time</span>
                    <p style={modalTextStyle}>{new Date(selectedEvent.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div style={modalInfoItemStyle}>
                    <span style={modalLabelStyle}>📍 End Date</span>
                    <p style={modalTextStyle}>{new Date(selectedEvent.endDate).toLocaleDateString()}</p>
                  </div>
                  <div style={modalInfoItemStyle}>
                    <span style={modalLabelStyle}>🎫 Type</span>
                    <p style={modalTextStyle}>{selectedEvent.type}</p>
                  </div>
                </div>

                {selectedEvent.venue && (
                  <div style={modalSectionStyle}>
                    <span style={modalLabelStyle}>📍 Venue</span>
                    <p style={modalTextStyle}>{selectedEvent.venue}</p>
                  </div>
                )}

                {selectedEvent.eligibility && (
                  <div style={modalSectionStyle}>
                    <span style={modalLabelStyle}>✅ Eligibility</span>
                    <p style={modalTextStyle}>{selectedEvent.eligibility}</p>
                  </div>
                )}

                <div style={modalSectionStyle}>
                  <span style={modalLabelStyle}>💰 Registration Fee</span>
                  <p style={modalTextStyle}>₹{selectedEvent.registrationFee || 0}</p>
                </div>

                {selectedEvent.type === 'Merchandise' && selectedEvent.merchandiseDetails && (
                  <div style={modalSectionStyle}>
                    <span style={modalLabelStyle}>📦 Stock Available</span>
                    <p style={modalTextStyle}>{selectedEvent.merchandiseDetails.stockQuantity - (selectedEvent.soldCount || 0)} items</p>
                  </div>
                )}

                <div style={modalSectionStyle}>
                  <span style={modalLabelStyle}>👥 Spots Available</span>
                  <p style={modalTextStyle}>{selectedEvent.registrationLimit - (selectedEvent.participants?.length || 0)} / {selectedEvent.registrationLimit}</p>
                </div>

                {/* Custom Registration Form Fields */}
                {showRegistrationForm && selectedEvent.customFields && selectedEvent.customFields.length > 0 && !registeredEvents.some(e => e._id === selectedEvent._id) && (
                  <div style={{
                    background: '#f0f4ff',
                    borderRadius: '12px',
                    padding: '20px',
                    marginTop: '15px',
                    border: '2px solid #90caf9'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.05rem' }}>
                      📋 Registration Form
                    </h4>
                    <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#666' }}>
                      Please fill in the following fields to complete your registration.
                    </p>
                    {[...(selectedEvent.customFields || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, idx) => (
                      <div key={idx} style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#333', marginBottom: '5px' }}>
                          {field.fieldName} {field.isRequired && <span style={{ color: '#f44336' }}>*</span>}
                        </label>

                        {field.fieldType === 'Text' && (
                          <input
                            type="text"
                            placeholder={field.placeholder || ''}
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                            required={field.isRequired}
                            style={{ width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                          />
                        )}

                        {field.fieldType === 'Textarea' && (
                          <textarea
                            placeholder={field.placeholder || ''}
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                            required={field.isRequired}
                            style={{ width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical' }}
                          />
                        )}

                        {field.fieldType === 'Number' && (
                          <input
                            type="number"
                            placeholder={field.placeholder || ''}
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                            required={field.isRequired}
                            style={{ width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                          />
                        )}

                        {field.fieldType === 'Date' && (
                          <input
                            type="date"
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                            required={field.isRequired}
                            style={{ width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                          />
                        )}

                        {field.fieldType === 'Email' && (
                          <input
                            type="email"
                            placeholder={field.placeholder || 'email@example.com'}
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                            required={field.isRequired}
                            style={{ width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                          />
                        )}

                        {field.fieldType === 'Phone' && (
                          <input
                            type="tel"
                            placeholder={field.placeholder || '+91 9876543210'}
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                            required={field.isRequired}
                            style={{ width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                          />
                        )}

                        {field.fieldType === 'Dropdown' && (
                          <select
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                            required={field.isRequired}
                            style={{ width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box', background: 'white' }}
                          >
                            <option value="">Select...</option>
                            {(field.options || []).map((opt, oi) => (
                              <option key={oi} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {field.fieldType === 'Checkbox' && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                            <input
                              type="checkbox"
                              checked={!!customFormData[field.fieldName]}
                              onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.checked})}
                              style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: '#555' }}>{field.placeholder || field.fieldName}</span>
                          </label>
                        )}

                        {field.fieldType === 'FileUpload' && (
                          <div>
                            <input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  setCustomFormData({...customFormData, [field.fieldName]: file.name});
                                }
                              }}
                              style={{ width: '100%', padding: '10px', border: '2px dashed #ddd', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                            />
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#888' }}>
                              📎 Upload a file (PDF, Image, Document)
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Show custom fields indicator if event has custom fields but form not yet shown */}
                {!showRegistrationForm && selectedEvent.customFields && selectedEvent.customFields.length > 0 && !registeredEvents.some(e => e._id === selectedEvent._id) && (
                  <div style={{
                    background: '#fff3e0',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    marginTop: '10px',
                    border: '1px solid #ffcc02'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#e65100' }}>
                      📋 This event has a custom registration form with {selectedEvent.customFields.length} field{selectedEvent.customFields.length > 1 ? 's' : ''} to fill.
                    </p>
                  </div>
                )}
              </div>

              <div style={modalFooterStyle}>
                {registeredEvents.some(e => e._id === selectedEvent._id) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '500px' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div style={{
                        ...modalRegisterButtonStyle,
                        background: '#4caf50',
                        cursor: 'default',
                        opacity: 0.8,
                        flex: canUnregister(selectedEvent) ? '1' : 'unset'
                      }}>
                        ✓ {selectedEvent.type === 'Merchandise' ? 'Already Purchased' : 'Already Registered'}
                      </div>
                      {canUnregister(selectedEvent) && (
                        <button
                          style={{
                            ...modalRegisterButtonStyle,
                            background: 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
                            boxShadow: '0 10px 30px rgba(245, 87, 108, 0.4)',
                            flex: '1'
                          }}
                          onClick={() => handleUnregister(selectedEvent)}
                        >
                          ✕ Unregister
                        </button>
                      )}
                    </div>
                    {/* Discussion Forum Button */}
                    <button
                      style={{
                        ...modalRegisterButtonStyle,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
                      }}
                      onClick={() => setShowDiscussionForum(!showDiscussionForum)}
                    >
                      💬 {showDiscussionForum ? 'Hide' : 'View'} Discussion Forum
                    </button>
                  </div>
                ) : (
                  <button 
                    style={modalRegisterButtonStyle} 
                    onClick={() => handleRegister(selectedEvent)}
                  >
                    {showRegistrationForm 
                      ? '✅ Submit & Register' 
                      : (selectedEvent.customFields?.length > 0 
                        ? '📋 Fill Form & Register' 
                        : (selectedEvent.type === 'Merchandise' ? '🛒 Buy Now' : '📝 Register Now')
                      )
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Discussion Forum Section */}
        {showDiscussionForum && selectedEvent && registeredEvents.some(e => e._id === selectedEvent._id) && (
          <div style={modalOverlayStyle} onClick={() => setShowDiscussionForum(false)}>
            <div style={{...modalContentStyle, maxWidth: '900px', maxHeight: '95vh'}} onClick={(e) => e.stopPropagation()}>
              <button style={closeButtonStyle} onClick={() => setShowDiscussionForum(false)}>✕</button>
              
              <div style={modalHeaderStyle}>
                <div style={modalIconStyle}>💬</div>
                <h2 style={modalTitleStyle}>Discussion Forum</h2>
                <p style={{margin: '10px 0 0 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)'}}>
                  {selectedEvent.name}
                </p>
              </div>

              <div style={{...modalBodyStyle, padding: 0, maxHeight: '70vh'}}>
                <DiscussionForum 
                  eventId={selectedEvent._id} 
                  isOrganizer={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* NEW: Team Creation Modal (Invite-Based System) */}
        {showTeamCreateModal && selectedEvent && (
          <div style={modalOverlayStyle} onClick={() => setShowTeamCreateModal(false)}>
            <div style={{...modalContentStyle, maxWidth: '700px'}} onClick={(e) => e.stopPropagation()}>
              <button style={modalCloseButtonStyle} onClick={() => setShowTeamCreateModal(false)}>✕</button>
              
              <div style={modalHeaderStyle}>
                <div style={modalIconStyle}>🎯</div>
                <h2 style={modalTitleStyle}>Create Team</h2>
                <p style={{margin: '10px 0 0 0', fontSize: '0.95rem', color: '#666'}}>
                  {selectedEvent.name}
                </p>
              </div>

              <div style={modalBodyStyle}>
                {/* Info Box */}
                <div style={{...infoBoxStyle, marginBottom: '20px', backgroundColor: '#e8f4fd', border: '1px solid #90caf9'}}>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#1976d2', lineHeight: '1.6'}}>
                    <strong>📋 How it works:</strong><br/>
                    1️⃣ Enter ALL team member emails (including yourself if you want to be a member)<br/>
                    2️⃣ Everyone receives invitations and must accept to join<br/>
                    3️⃣ When all members accept, your team is complete!<br/>
                    4️⃣ Tickets are generated automatically for all accepted members
                  </p>
                </div>

                {/* Team Size Info */}
                <div style={{...infoBoxStyle, marginBottom: '20px'}}>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#666'}}>
                    <strong>Team Size Range:</strong> {selectedEvent.teamDetails?.minTeamSize} - {selectedEvent.teamDetails?.maxTeamSize} members<br/>
                    <strong>Fee per Member:</strong> ₹{selectedEvent.registrationFee}<br/>
                    <strong>Total Fee (if {teamCreateData.teamSize} members):</strong> ₹{teamCreateData.teamSize * selectedEvent.registrationFee}
                  </p>
                </div>

                {/* Custom Form Fields */}
                {selectedEvent.customFields && selectedEvent.customFields.length > 0 && (
                  <div style={{marginBottom: '20px'}}>
                    <h4 style={{margin: '0 0 15px 0', fontSize: '1rem', color: '#333'}}>
                      Additional Information
                    </h4>
                    {selectedEvent.customFields.map((field, idx) => (
                      <div key={idx} style={{marginBottom: '15px'}}>
                        <label style={teamLabelStyle}>
                          {field.fieldName} {field.isRequired && <span style={{color: '#f44336'}}>*</span>}
                        </label>
                        {field.fieldType === 'text' && (
                          <input 
                            type="text"
                            style={teamInputStyle}
                            placeholder={field.placeholder || `Enter ${field.fieldName}`}
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                          />
                        )}
                        {field.fieldType === 'dropdown' && (
                          <select
                            style={teamInputStyle}
                            value={customFormData[field.fieldName] || ''}
                            onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})}
                          >
                            <option value="">Select {field.fieldName}</option>
                            {field.options?.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {field.fieldType === 'checkbox' && (
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <input 
                              type="checkbox"
                              checked={customFormData[field.fieldName] || false}
                              onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.checked})}
                            />
                            <span>{field.placeholder || field.fieldName}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Team Details */}
                <div style={{marginBottom: '20px'}}>
                  <label style={teamLabelStyle}>Team Name *</label>
                  <input 
                    type="text"
                    style={teamInputStyle}
                    placeholder="Enter your team name"
                    value={teamCreateData.teamName}
                    onChange={(e) => setTeamCreateData({...teamCreateData, teamName: e.target.value})}
                  />
                </div>

                <div style={{marginBottom: '20px'}}>
                  <label style={teamLabelStyle}>Team Size *</label>
                  <input 
                    type="number"
                    style={teamInputStyle}
                    min={selectedEvent.teamDetails?.minTeamSize || 2}
                    max={selectedEvent.teamDetails?.maxTeamSize || 4}
                    value={teamCreateData.teamSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      const min = selectedEvent.teamDetails?.minTeamSize || 2;
                      const max = selectedEvent.teamDetails?.maxTeamSize || 4;
                      
                      if (newSize >= min && newSize <= max) {
                        const emailsNeeded = newSize - 1; // Exclude leader
                        const currentEmails = teamCreateData.memberEmails;
                        let newEmails = [...currentEmails];
                        
                        if (emailsNeeded > currentEmails.length) {
                          // Add empty fields
                          newEmails = [...newEmails, ...Array(emailsNeeded - currentEmails.length).fill('')];
                        } else if (emailsNeeded < currentEmails.length) {
                          // Remove extra fields
                          newEmails = newEmails.slice(0, emailsNeeded);
                        }
                        
                        setTeamCreateData({
                          ...teamCreateData,
                          teamSize: newSize,
                          memberEmails: newEmails
                        });
                      }
                    }}
                  />
                  <small style={{color: '#666', fontSize: '0.85rem'}}>
                    Must be between {selectedEvent.teamDetails?.minTeamSize || 2} and {selectedEvent.teamDetails?.maxTeamSize || 4}
                  </small>
                </div>

                {/* Member Emails */}
                <div style={{marginBottom: '20px'}}>
                  <label style={teamLabelStyle}>
                    Team Member Emails * ({teamCreateData.memberEmails.length} of {teamCreateData.teamSize} needed)
                  </label>
                  <p style={{margin: '5px 0 10px 0', fontSize: '0.85rem', color: '#666'}}>
                    Enter emails of ALL team members (include yourself if you want to be a member)
                  </p>
                  
                  {teamCreateData.memberEmails.map((email, index) => (
                    <div key={index} style={{display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center'}}>
                      <span style={{minWidth: '30px', color: '#666', fontSize: '0.9rem'}}>
                        {index + 1}.
                      </span>
                      <input 
                        type="email"
                        style={{...teamInputStyle, flex: 1, margin: 0}}
                        placeholder={`Member ${index + 1} email`}
                        value={email}
                        onChange={(e) => updateTeamEmail(index, e.target.value)}
                      />
                      {teamCreateData.memberEmails.length > 1 && (
                        <button
                          onClick={() => removeTeamEmailField(index)}
                          style={{
                            ...actionButtonStyle,
                            backgroundColor: '#f44336',
                            padding: '8px 12px',
                            fontSize: '0.85rem'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  {teamCreateData.memberEmails.length < (selectedEvent.teamDetails?.maxTeamSize || 4) && (
                    <button
                      onClick={addTeamEmailField}
                      style={{
                        ...actionButtonStyle,
                        backgroundColor: '#4caf50',
                        width: '100%',
                        marginTop: '10px'
                      }}
                    >
                      + Add Another Member Email
                    </button>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleCreateTeam}
                  style={{
                    ...actionButtonStyle,
                    backgroundColor: '#1976d2',
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  🚀 Create Team & Send Invites
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Registration Form Modal */}
        {showTeamForm && selectedEvent && (
          <div style={modalOverlayStyle} onClick={() => setShowTeamForm(false)}>
            <div style={{...modalContentStyle, maxWidth: '700px'}} onClick={(e) => e.stopPropagation()}>
              <button style={modalCloseButtonStyle} onClick={() => setShowTeamForm(false)}>✕</button>
              
              <div style={modalHeaderStyle}>
                <div style={modalIconStyle}>👥</div>
                <h2 style={modalTitleStyle}>Team Registration</h2>
                <p style={{margin: '10px 0 0 0', fontSize: '0.95rem', color: '#666'}}>
                  {selectedEvent.name}
                </p>
              </div>

              <div style={modalBodyStyle}>
                <div style={{...infoBoxStyle, marginBottom: '20px'}}>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#666'}}>
                    <strong>Team Size:</strong> {selectedEvent.teamDetails?.minTeamSize} - {selectedEvent.teamDetails?.maxTeamSize} members<br/>
                    <strong>Fee per Member:</strong> ₹{selectedEvent.registrationFee}<br/>
                    <strong>Total Fee:</strong> ₹{teamFormData.members.length * selectedEvent.registrationFee}
                  </p>
                </div>

                {/* Team Details */}
                <div style={{marginBottom: '20px'}}>
                  <label style={teamLabelStyle}>Team Name *</label>
                  <input 
                    type="text"
                    style={teamInputStyle}
                    placeholder="Enter team name"
                    value={teamFormData.teamName}
                    onChange={(e) => setTeamFormData({...teamFormData, teamName: e.target.value})}
                    required
                  />
                </div>

                {/* POC Details */}
                <div style={{marginBottom: '20px', padding: '15px', background: '#f0f4ff', borderRadius: '8px'}}>
                  <h4 style={{margin: '0 0 15px 0', color: '#667eea'}}>📞 Point of Contact (POC)</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <div>
                      <label style={teamLabelStyle}>POC Name *</label>
                      <input 
                        type="text"
                        style={teamInputStyle}
                        placeholder="POC Name"
                        value={teamFormData.pocName}
                        onChange={(e) => setTeamFormData({...teamFormData, pocName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label style={teamLabelStyle}>POC Email *</label>
                      <input 
                        type="email"
                        style={teamInputStyle}
                        placeholder="POC Email"
                        value={teamFormData.pocEmail}
                        onChange={(e) => setTeamFormData({...teamFormData, pocEmail: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h4 style={{margin: 0, color: '#333'}}>👤 Team Members ({teamFormData.members.length})</h4>
                    <button 
                      type="button"
                      style={{...teamAddButtonStyle}}
                      onClick={addTeamMember}
                      disabled={teamFormData.members.length >= (selectedEvent.teamDetails?.maxTeamSize || 4)}
                    >
                      + Add Member
                    </button>
                  </div>
                  
                  {teamFormData.members.map((member, index) => (
                    <div key={index} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto',
                      gap: '10px',
                      marginBottom: '10px',
                      padding: '10px',
                      background: '#f9f9f9',
                      borderRadius: '8px'
                    }}>
                      <input 
                        type="text"
                        style={teamInputStyle}
                        placeholder={`Member ${index + 1} Name *`}
                        value={member.name}
                        onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                        required
                      />
                      <input 
                        type="email"
                        style={teamInputStyle}
                        placeholder={`Member ${index + 1} Email *`}
                        value={member.email}
                        onChange={(e) => updateTeamMember(index, 'email', e.target.value)}
                        required
                      />
                      {teamFormData.members.length > 1 && (
                        <button 
                          type="button"
                          style={teamRemoveButtonStyle}
                          onClick={() => removeTeamMember(index)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Custom Registration Form Fields in Team Registration */}
                {selectedEvent.customFields && selectedEvent.customFields.length > 0 && (
                  <div style={{
                    background: '#f0f4ff',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '2px solid #90caf9'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#667eea', fontSize: '1rem' }}>
                      📋 Additional Registration Fields
                    </h4>
                    {[...(selectedEvent.customFields || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, idx) => (
                      <div key={idx} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#333', marginBottom: '5px' }}>
                          {field.fieldName} {field.isRequired && <span style={{ color: '#f44336' }}>*</span>}
                        </label>
                        {field.fieldType === 'Text' && (
                          <input type="text" placeholder={field.placeholder || ''} value={customFormData[field.fieldName] || ''} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})} style={teamInputStyle} />
                        )}
                        {field.fieldType === 'Textarea' && (
                          <textarea placeholder={field.placeholder || ''} value={customFormData[field.fieldName] || ''} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})} style={{...teamInputStyle, minHeight: '70px', resize: 'vertical'}} />
                        )}
                        {field.fieldType === 'Number' && (
                          <input type="number" placeholder={field.placeholder || ''} value={customFormData[field.fieldName] || ''} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})} style={teamInputStyle} />
                        )}
                        {field.fieldType === 'Date' && (
                          <input type="date" value={customFormData[field.fieldName] || ''} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})} style={teamInputStyle} />
                        )}
                        {field.fieldType === 'Email' && (
                          <input type="email" placeholder={field.placeholder || 'email@example.com'} value={customFormData[field.fieldName] || ''} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})} style={teamInputStyle} />
                        )}
                        {field.fieldType === 'Phone' && (
                          <input type="tel" placeholder={field.placeholder || '+91 9876543210'} value={customFormData[field.fieldName] || ''} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})} style={teamInputStyle} />
                        )}
                        {field.fieldType === 'Dropdown' && (
                          <select value={customFormData[field.fieldName] || ''} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.value})} style={{...teamInputStyle, background: 'white'}}>
                            <option value="">Select...</option>
                            {(field.options || []).map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
                          </select>
                        )}
                        {field.fieldType === 'Checkbox' && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                            <input type="checkbox" checked={!!customFormData[field.fieldName]} onChange={(e) => setCustomFormData({...customFormData, [field.fieldName]: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                            <span style={{ fontSize: '0.9rem', color: '#555' }}>{field.placeholder || field.fieldName}</span>
                          </label>
                        )}
                        {field.fieldType === 'FileUpload' && (
                          <input type="file" onChange={(e) => { if (e.target.files[0]) setCustomFormData({...customFormData, [field.fieldName]: e.target.files[0].name}); }} style={{ width: '100%', padding: '8px', border: '2px dashed #ddd', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display: 'flex', gap: '10px'}}>
                  <button 
                    style={{...modalRegisterButtonStyle, flex: 1, background: '#f5576c'}}
                    onClick={() => { setShowTeamForm(false); setCustomFormData({}); }}
                  >
                    Cancel
                  </button>
                  <button 
                    style={{...modalRegisterButtonStyle, flex: 2}}
                    onClick={handleTeamRegister}
                  >
                    Register Team (₹{teamFormData.members.length * selectedEvent.registrationFee})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

// --- Styles ---
const followBtnStyle = { padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '10px', transition: 'all 0.3s ease' };
const unfollowBtnStyle = { padding: '10px 20px', background: '#f5576c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '10px', transition: 'all 0.3s ease' };
const actionButtonStyle = { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease', fontSize: '0.9rem' };
const sectionHeaderStyle = { marginBottom: '20px', color: '#333', fontSize: '1.8rem', fontWeight: '700' };
const dateTimeStyle = { fontSize: '0.9rem', color: '#555', borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px' };

// Modal Styles
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(5px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  animation: 'fadeIn 0.3s ease'
};

const modalContentStyle = {
  background: 'white',
  borderRadius: '20px',
  width: '90%',
  maxWidth: '700px',
  maxHeight: '90vh',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  position: 'relative',
  animation: 'slideInUp 0.3s ease',
  display: 'flex',
  flexDirection: 'column'
};

const closeButtonStyle = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  background: 'rgba(245, 87, 108, 0.1)',
  border: 'none',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  fontSize: '1.5rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#f5576c',
  fontWeight: 'bold',
  transition: 'all 0.3s ease',
  zIndex: 10
};

const modalCloseButtonStyle = {
  position: 'absolute',
  top: '15px',
  right: '15px',
  background: 'transparent',
  border: 'none',
  fontSize: '1.8rem',
  cursor: 'pointer',
  color: 'white',
  fontWeight: 'bold',
  padding: '5px 10px',
  borderRadius: '50%',
  transition: 'all 0.3s ease',
  zIndex: 20
};

const modalHeaderStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '40px 30px 30px',
  textAlign: 'center',
  color: 'white'
};

const modalIconStyle = {
  fontSize: '4rem',
  marginBottom: '15px'
};

const modalTitleStyle = {
  margin: 0,
  fontSize: '2rem',
  fontWeight: '700',
  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
};

const modalBodyStyle = {
  padding: '30px',
  overflowY: 'auto',
  flex: 1
};

const modalSectionStyle = {
  marginBottom: '25px'
};

const modalLabelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '700',
  color: '#667eea',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px'
};

const modalTextStyle = {
  margin: 0,
  fontSize: '1rem',
  color: '#333',
  lineHeight: '1.6'
};

const modalInfoGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '20px',
  marginBottom: '25px'
};

const modalInfoItemStyle = {
  background: '#f8f9ff',
  padding: '15px',
  borderRadius: '10px',
  border: '1px solid #e0e7ff'
};

const modalFooterStyle = {
  padding: '20px 30px',
  background: '#f8f9ff',
  borderTop: '1px solid #e0e7ff',
  display: 'flex',
  justifyContent: 'center'
};

const modalRegisterButtonStyle = {
  padding: '15px 40px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '30px',
  fontSize: '1.1rem',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
  transition: 'all 0.3s ease',
  width: '100%',
  maxWidth: '300px'
};

const searchContainerStyle = {
  marginTop: '25px',
  position: 'relative',
  maxWidth: '600px',
  margin: '25px auto 0 auto'
};

const searchIconStyle = {
  position: 'absolute',
  left: '15px',
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '1.2rem',
  color: '#888'
};

const searchInputStyle = {
  width: '100%',
  padding: '15px 15px 15px 45px',
  fontSize: '1rem',
  border: '2px solid #eee',
  borderRadius: '30px',
  outline: 'none',
  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  transition: 'all 0.3s ease'
};
const containerStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', fontFamily: 'sans-serif' };
const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' };
const navBrandStyle = { display: 'flex', alignItems: 'center', gap: '15px' };
const navIconStyle = { fontSize: '2rem' };
const navTitleStyle = { margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#333' };
const logoutButtonStyle = { padding: '10px 24px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' };
const contentStyle = { padding: '40px', maxWidth: '1200px', margin: '0 auto' };
const welcomeBoxStyle = { background: 'white', borderRadius: '15px', padding: '40px', marginBottom: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center' };
const headingStyle = { fontSize: '2.5rem', fontWeight: '700', color: '#333', marginBottom: '10px' };
const subtitleStyle = { fontSize: '1.1rem', color: '#666' };
const cardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' };
const infoCardStyle = { position: 'relative', background: 'white', borderRadius: '15px', padding: '30px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const cardIconStyle = { fontSize: '3rem', marginBottom: '15px' };
const cardTitleStyle = { fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '5px' };
const cardDescStyle = { fontSize: '0.9rem', color: '#666', marginBottom: '15px', lineHeight: '1.4' };
const cardButtonStyle = { padding: '10px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '15px' };

// Profile Button Style
const profileButtonStyle = {
  padding: '10px 20px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
};

// Profile Modal Styles
const profileModalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
  animation: 'fadeIn 0.3s ease'
};

const profileModalStyle = {
  background: 'white',
  borderRadius: '20px',
  width: '90%',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflow: 'hidden',
  boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
  animation: 'slideInUp 0.3s ease',
  display: 'flex',
  flexDirection: 'column'
};

const profileHeaderStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '40px 30px',
  textAlign: 'center',
  color: 'white'
};

const profileAvatarStyle = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.3)',
  margin: '0 auto 15px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  fontWeight: 'bold',
  color: 'white',
  textTransform: 'uppercase',
  border: '3px solid white'
};

const profileBodyStyle = {
  padding: '30px',
  overflowY: 'auto',
  flex: 1,
  maxHeight: '60vh'
};

const profileSectionStyle = {
  marginBottom: '25px',
  paddingBottom: '20px',
  borderBottom: '1px solid #eee'
};

const profileSectionTitleStyle = {
  fontSize: '1rem',
  fontWeight: '700',
  color: '#667eea',
  marginBottom: '15px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const profileInfoTextStyle = {
  margin: '8px 0',
  fontSize: '0.95rem',
  color: '#555',
  lineHeight: '1.6'
};

const interestTagsContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px'
};

const interestTagStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '0.85rem',
  fontWeight: '600',
  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
};

const followedClubsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const clubItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: '#f8f9ff',
  borderRadius: '10px',
  border: '1px solid #e0e7ff'
};

const editProfileButtonStyle = {
  marginTop: '10px',
  padding: '10px 20px',
  background: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '0.9rem',
  transition: 'all 0.3s ease'
};

const closeProfileButtonStyle = {
  padding: '15px',
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '0 0 20px 20px',
  fontSize: '1rem',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};

// Recommendation Badge Styles
const topPickBadgeStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
  color: '#333',
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: '700',
  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
  zIndex: 10,
  animation: 'pulse 2s infinite'
};

const recommendedBadgeStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: '600',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  zIndex: 10
};

// Navigation Styles
const navMenuStyle = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center'
};

const navButtonStyle = {
  padding: '10px 20px',
  background: 'transparent',
  color: '#666',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  position: 'relative'
};

const activeNavButtonStyle = {
  padding: '10px 20px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  position: 'relative'
};

const badgeStyle = {
  position: 'absolute',
  top: '-5px',
  right: '-5px',
  background: '#f5576c',
  color: 'white',
  borderRadius: '50%',
  width: '20px',
  height: '20px',
  fontSize: '11px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  boxShadow: '0 2px 8px rgba(245, 87, 108, 0.4)'
};

const registeredBadgeStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
  color: 'white',
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: '600',
  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
  zIndex: 10
};

// Team Registration Form Styles
const teamLabelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#555', marginBottom: '5px' };
const teamInputStyle = { width: '100%', padding: '10px', border: '2px solid #eee', borderRadius: '6px', fontSize: '0.95rem', transition: 'border 0.3s ease' };
const teamAddButtonStyle = { padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.3s ease' };
const teamRemoveButtonStyle = { padding: '8px 12px', background: '#f5576c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' };
const infoBoxStyle = { background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #90caf9' };

export default ParticipantDashboard;