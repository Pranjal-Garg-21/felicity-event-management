# Team Invite-Based Registration System

## Overview
Implemented a robust team registration system with invite codes, member acceptance tracking, and automatic ticket generation upon team completion.

## Features Implemented

### 1. **Schema Updates**

#### Event Model (`backend/models/Event.js`)
- Enhanced `teamRegistrations` with:
  - `teamLeaderId`: Reference to User who created the team
  - `inviteCode`: Unique 8-character code for joining
  - `status`: Pending/Complete/Cancelled
  - `teamSize`: Expected number of members
  - `members[]`: Array with individual member status (Pending/Accepted/Declined)
  - `completedAt`: Timestamp when all members accept
  
#### User Model (`backend/models/User.js`)
- Added `teamInvites[]` array to track received invitations with:
  - `eventId`, `teamId`, `inviteCode`
  - `teamName`, `teamLeaderName`, `teamLeaderEmail`
  - `status`: Pending/Accepted/Declined
  - `invitedAt`, `respondedAt`

### 2. **Backend API Routes** (`backend/routes/teamRoutes.js`)

#### `POST /api/teams/create/:eventId`
- Team leader creates a team
- Provides: `teamName`, `teamSize`, `memberEmails[]`
- Generates unique `inviteCode`
- Sends invitations to all member emails
- Returns invite link: `http://frontend.com/join-team/{inviteCode}`

#### `POST /api/teams/join/:inviteCode`
- Member accepts invitation using invite code
- Updates member status to "Accepted"
- Checks if all members have accepted
- **If complete:**
  - Sets team status to "Complete"
  - Adds all members to `event.participants`
  - Generates tickets for all members
  - Sends ticket emails to all members

#### `POST /api/teams/decline/:inviteCode`
- Member declines invitation
- Updates invite status

#### `GET /api/teams/my-teams`
- Returns all teams user is part of (as leader or member)
- Includes team status, member list, event details

#### `GET /api/teams/invitations`
- Returns all pending team invitations for the user

#### `DELETE /api/teams/cancel/:teamId`
- Team leader can cancel pending teams
- Removes invites from all invited members

### 3. **Frontend Components**

#### Team Management Dashboard (`frontend/src/pages/TeamManagement.js`)
- **Two Tabs:**
  1. **My Teams**: Shows all teams (as leader/member)
  2. **Invitations**: Shows pending invites with Accept/Decline buttons

- **My Teams Display:**
  - Team name, event, status (Complete/Pending/Cancelled)
  - Member list with individual statuses
  - Invite code and "Copy Invite Link" button (for leaders)
  - "Cancel Team" button (for leaders of pending teams)

- **Invitations Display:**
  - Invitation details (team name, leader, event)
  - Accept/Decline buttons
  - Badge showing count of pending invites

### 4. **Team Creation Flow**

**REQUIRED FRONTEND INTEGRATION:**

Update `ParticipantDashboard.js` to add team creation modal:

```jsx
// Add state for team creation
const [showTeamCreateModal, setShowTeamCreateModal] = useState(false);
const [teamFormData, setTeamFormData] = useState({
  teamName: '',
  teamSize: 2,
  memberEmails: ['']
});

// When user clicks Register on a Team event
const handleRegister = async (event) => {
  if (event.type === 'Team') {
    setShowTeamCreateModal(true);
    return;
  }
  // ... existing individual registration
};

// Team creation handler
const handleCreateTeam = async () => {
  try {
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    const { data } = await axios.post(
      `http://localhost:5000/api/teams/create/${selectedEvent._id}`,
      teamFormData,
      config
    );
    
    alert(`✅ ${data.message}\n\n📋 Invite Code: ${data.inviteCode}\n\nShare this code with your team members!`);
    
    // Copy invite link to clipboard
    navigator.clipboard.writeText(data.inviteLink);
    alert('Invite link copied to clipboard!');
    
    setShowTeamCreateModal(false);
    setSelectedEvent(null);
  } catch (err) {
    alert(err.response?.data?.message || 'Error creating team');
  }
};
```

### 5. **Join Team Page** (`frontend/src/pages/JoinTeam.js`)

**CREATE THIS NEW COMPONENT:**

```jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const JoinTeam = () => {
  const { inviteCode } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      alert('Please login to join a team');
      navigate('/login');
      return;
    }
    
    if (inviteCode) {
      handleJoin();
    }
  }, [inviteCode, user]);

  const handleJoin = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(
        `http://localhost:5000/api/teams/join/${inviteCode}`,
        {},
        config
      );
      
      alert(data.message);
      navigate('/teams'); // Redirect to team management
    } catch (err) {
      alert(err.response?.data?.message || 'Error joining team');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      {loading ? (
        <p>Joining team...</p>
      ) : (
        <p>Redirecting...</p>
      )}
    </div>
  );
};

export default JoinTeam;
```

### 6. **Router Updates** (`frontend/src/App.js`)

Add these routes:

```jsx
import TeamManagement from './pages/TeamManagement';
import JoinTeam from './pages/JoinTeam';

// In the router:
<Route path="/teams" element={user ? <TeamManagement /> : <Navigate to="/login" />} />
<Route path="/join-team/:inviteCode" element={user ? <JoinTeam /> : <Navigate to="/login" />} />
```

### 7. **Navigation Updates**

Add "Teams" link to Participant Dashboard nav menu:

```jsx
<button onClick={() => navigate('/teams')} style={navButtonStyle}>
  👥 My Teams
</button>
```

## User Flow

### Team Leader Flow:
1. Finds a Team event in Participant Dashboard
2. Clicks "Register" → Team Creation Modal opens
3. Enters team name, team size (2-4), and member emails
4. Submits → Team created with unique invite code
5. Invite link copied to clipboard automatically
6. Shares invite link/code with team members
7. Can view team status in "My Teams" tab
8. Can cancel team before completion
9. Once all members accept → Team auto-completes → Tickets generated

### Team Member Flow:
1. Receives invite link or code from team leader
2. Opens link `/join-team/{inviteCode}` (while logged in)
3. Auto-joins team (or can view in "Invitations" tab)
4. Can Accept/Decline invitation
5. If accepts → Team status updates
6. If all members accept → Gets ticket email automatically

## Automatic Ticket Generation

When the last member accepts and team becomes "Complete":
1. Team status → "Complete"
2. `completedAt` timestamp set
3. All members added to `event.participants`
4. Shared team ticket ID generated
5. Ticket record saved in each member's `eventTickets`
6. Email with QR code sent to all members
7. All members see event in "My Events"

## Testing Checklist

- [ ] Create team as leader
- [ ] Receive invite code and link
- [ ] Share link with team members
- [ ] Members can accept invitation
- [ ] Members can decline invitation
- [ ] Team status updates correctly
- [ ] When all members accept, team completes
- [ ] Tickets generated for all members
- [ ] Emails sent to all members
- [ ] QR codes work for all members
- [ ] Team appears in "My Events" for all members
- [ ] Leader can cancel pending team
- [ ] Cannot join with invalid code
- [ ] Cannot join if not invited
- [ ] Registration deadline respected
- [ ] Event capacity limits respected

## Database Migration

No migration needed - the new schema fields are additive. Old team registrations will continue to work (backward compatible).

## Environment Variables

Add to `.env`:
```
FRONTEND_URL=http://localhost:3000
```

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/teams/create/:eventId` | Participant | Create team |
| POST | `/api/teams/join/:inviteCode` | Participant | Accept invite |
| POST | `/api/teams/decline/:inviteCode` | Participant | Decline invite |
| GET | `/api/teams/my-teams` | Participant | Get my teams |
| GET | `/api/teams/invitations` | Participant | Get pending invites |
| DELETE | `/api/teams/cancel/:teamId` | Participant | Cancel team (leader only) |

## Next Steps

1. ✅ Schema updated
2. ✅ Backend routes created
3. ✅ Team Management Dashboard created
4. ⏳ Update ParticipantDashboard with team creation modal
5. ⏳ Create JoinTeam page
6. ⏳ Update App.js routes
7. ⏳ Add email notifications for invites
8. ⏳ Test complete flow

## Implementation Status

**Backend:** ✅ 100% Complete
**Frontend:** 🔄 60% Complete (Team Management Dashboard done, need team creation modal and join page)

