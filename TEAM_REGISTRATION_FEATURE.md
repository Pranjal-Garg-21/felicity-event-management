# Team Registration Feature Documentation

## Overview
The team registration feature allows organizers to create events that require team-based participation, where multiple participants (2-4 or custom) register together as a team with a designated Point of Contact (POC).

## Features Implemented

### 1. Event Model Updates (`backend/models/Event.js`)

**New Event Type:**
- Added `'Team'` to the event type enum (Normal, Merchandise, Team)

**Team Event Schema:**
```javascript
teamDetails: {
  minTeamSize: Number,  // e.g., 2
  maxTeamSize: Number,  // e.g., 4
  requiresPOC: Boolean  // Default: true
}

teamRegistrations: [{
  teamName: String,
  pocName: String,
  pocEmail: String,
  members: [{
    name: String,
    email: String
  }],
  registeredAt: Date,
  totalFee: Number  // Calculated as: members.length × registrationFee
}]
```

### 2. Organizer Dashboard Updates (`frontend/src/pages/OrganizerDashboard.js`)

**Create Event Form:**
- Added "Team Event" option in event type dropdown
- Dynamic fields appear when Team event is selected:
  - Minimum Team Size (number input)
  - Maximum Team Size (number input)
  - Info box showing team registration details
- Registration fee labeled as "per participant" for team events
- Registration limit represents number of teams (not individuals)

**Event Details View:**
- Shows team-specific information:
  - Team size range
  - Total teams registered vs. limit
  - Registration fee per participant
- **Team Registrations Display:**
  - Beautiful card-based layout for each team
  - Shows team name, team number, member count
  - Displays total fee prominently
  - POC details highlighted in a special section
  - Team members listed with names and emails
  - Visual hierarchy with colors and icons

**Key Code Segments:**
```javascript
// Form state includes team details
formData: {
  minTeamSize: '',
  maxTeamSize: '',
  ...
}

// Event creation includes team details
if (formData.type === 'Team') {
  eventData.teamDetails = {
    minTeamSize: parseInt(formData.minTeamSize),
    maxTeamSize: parseInt(formData.maxTeamSize),
    requiresPOC: true
  };
}
```

### 3. Participant Dashboard Updates (`frontend/src/pages/ParticipantDashboard.js`)

**Team Registration Modal:**
- Opens when clicking "Register Now" on a team event
- Shows event name and team requirements
- Dynamic total fee calculation (updates as members are added)

**Form Fields:**
1. **Team Information:**
   - Team Name (required)

2. **Point of Contact (POC):**
   - POC Name (required)
   - POC Email (required)
   - Displayed in highlighted blue section

3. **Team Members:**
   - Dynamic member list (starts with 1 member)
   - Each member has: Name and Email fields
   - Add Member button (disabled when max size reached)
   - Remove Member button (minimum 1 member required)
   - Shows current member count

**Validation:**
- Team size must be between min and max
- All fields required (team name, POC details, member details)
- Email validation
- Registration deadline check
- Team limit check

**User Experience:**
- Real-time total fee calculation
- Confirmation dialog before submission
- Success message with team name and total fee
- Automatic modal closure and event list refresh
- Clean form reset after successful registration

### 4. Backend API Routes (`backend/routes/eventRoutes.js`)

**New Endpoint:**
```
POST /api/events/register-team/:id
Authorization: Bearer token (Participant only)
```

**Request Body:**
```json
{
  "teamName": "Team Alpha",
  "pocName": "John Doe",
  "pocEmail": "john@example.com",
  "members": [
    { "name": "Alice Smith", "email": "alice@example.com" },
    { "name": "Bob Johnson", "email": "bob@example.com" },
    { "name": "Carol White", "email": "carol@example.com" }
  ],
  "totalFee": 900
}
```

**Response:**
```json
{
  "message": "Team registered successfully!",
  "teamName": "Team Alpha",
  "totalFee": 900
}
```

**Validations:**
- Event exists
- Event is type "Team"
- Registration deadline not passed
- Team limit not reached
- All required fields present
- Team size within allowed range
- Calculates total fee if not provided

### 5. Styling

**Organizer Dashboard:**
- `infoBoxStyle`: Blue info box for team event details
- Team registration cards with gradient borders
- POC section with special background color
- Member grid layout (responsive)
- Proper spacing and visual hierarchy

**Participant Dashboard:**
- `teamLabelStyle`: Form labels
- `teamInputStyle`: Input fields with borders
- `teamAddButtonStyle`: Purple button for adding members
- `teamRemoveButtonStyle`: Red button for removing members
- `infoBoxStyle`: Blue info box showing fee calculation
- `modalCloseButtonStyle`: Close button for modal

## User Flows

### Organizer Creating Team Event:
1. Navigate to "Create Event" tab
2. Select "Team Event" from type dropdown
3. Fill in basic event details
4. Specify minimum team size (e.g., 2)
5. Specify maximum team size (e.g., 4)
6. Set registration fee (per participant)
7. Set registration limit (number of teams)
8. Submit form
9. Event appears in "Published Events" tab

### Organizer Viewing Team Registrations:
1. Go to "Published Events" tab
2. Click on a team event
3. View event details (team size, fee per participant)
4. Scroll to "Registered Teams" section
5. See all teams with:
   - Team name and number
   - Total fee paid
   - POC name and email
   - All team members with names and emails

### Participant Registering Team:
1. Browse events (any tab)
2. Click on team event card
3. View event details in modal
4. Click "Register Now"
5. Team registration form modal opens
6. Fill in team name
7. Fill in POC details (name and email)
8. Fill in first member details
9. Click "+ Add Member" to add more members
10. Fill in all member details (name and email for each)
11. Review total fee at top and bottom of form
12. Click "Register Team (₹XXX)" button
13. Confirm in dialog
14. Receive success message
15. Modal closes automatically

## Fee Calculation

**Formula:**
```
Total Fee = Number of Team Members × Registration Fee per Participant
```

**Example:**
- Registration Fee: ₹300 per participant
- Team Size: 3 members
- Total Fee: ₹900

This is calculated automatically and displayed:
- In the info box at the top of the form
- In the submit button text
- In the confirmation dialog
- In the success message

## Technical Implementation Notes

1. **State Management:**
   - Organizer: `formData` includes `minTeamSize` and `maxTeamSize`
   - Participant: `teamFormData` with `teamName`, `pocName`, `pocEmail`, and `members` array

2. **Dynamic Member Management:**
   - `addTeamMember()`: Adds new empty member to array
   - `removeTeamMember(index)`: Removes member at index
   - `updateTeamMember(index, field, value)`: Updates specific member field

3. **Data Flow:**
   - Frontend validates team size before submission
   - Backend validates again for security
   - Total fee calculated on both frontend (display) and backend (verification)

4. **Database Storage:**
   - Team registrations stored as subdocuments in Event model
   - Separate from individual participants array
   - Includes registration timestamp for each team

## Testing Checklist

### Organizer:
- [ ] Create team event with min/max team size
- [ ] View created team event in published events
- [ ] Click on team event to view details
- [ ] Verify team size displays correctly
- [ ] Verify fee shows "per participant"
- [ ] Check team registrations section appears
- [ ] Verify empty state shows when no teams registered

### Participant:
- [ ] View team event in event listings
- [ ] Click "Register Now" on team event
- [ ] Team form modal opens (not regular registration)
- [ ] Fill in all required fields
- [ ] Add members up to maximum size
- [ ] Try adding beyond maximum (should show alert)
- [ ] Remove members (minimum 1 should remain)
- [ ] Verify total fee updates when adding/removing members
- [ ] Submit team registration
- [ ] Verify success message
- [ ] Check team appears in organizer's view

### Backend:
- [ ] Team event creation saves teamDetails correctly
- [ ] Team registration endpoint validates team size
- [ ] Registration deadline checked
- [ ] Team limit enforced
- [ ] Total fee calculated correctly
- [ ] Team data stored properly in database

## Future Enhancements

1. **Team Member Validation:**
   - Check for duplicate emails in team
   - Verify member emails exist in system
   - Prevent same person from joining multiple teams

2. **Team Management:**
   - Allow team leader to edit team details before deadline
   - Team member invitation system
   - Team member confirmation/acceptance

3. **Enhanced Organizer Features:**
   - Export team registrations to CSV/Excel
   - Email all team POCs
   - Team scoring/ranking system
   - Certificate generation per team

4. **Participant Features:**
   - View teams I'm part of
   - Team-based event history
   - Team chat/communication

5. **Payment Integration:**
   - Split payment options for teams
   - Team-based payment tracking
   - Refund handling for team events

## Summary

The team registration feature provides a complete solution for events requiring group participation. It maintains the same user experience standards as individual and merchandise events while adding the necessary complexity for team management. The fee structure is transparent (per participant), and all validations ensure data integrity throughout the registration process.
