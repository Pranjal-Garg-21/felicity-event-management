# Organizer Password Reset Workflow - Complete Implementation

## Overview
Comprehensive password reset system for organizers with admin approval, auto-generated passwords, request tracking, and history.

## Features Implemented

### 1. Organizer Request Password Reset
- **Endpoint**: `POST /api/auth/request-reset`
- **Access**: Private (Organizer only)
- **Body**: `{ reason: string }`
- **Features**:
  - Requires detailed reason (minimum 10 characters)
  - Prevents duplicate pending requests
  - Timestamps the request
  - Sets status to 'Pending'

### 2. Admin View Reset Requests
- **Endpoint**: `GET /api/admin/reset-requests`
- **Access**: Private (Admin only)
- **Returns**:
  ```json
  [
    {
      "_id": "userId",
      "clubName": "Club Name",
      "email": "organizer@example.com",
      "category": "Technical",
      "reason": "Forgot password, need access urgently",
      "requestedAt": "2026-02-08T...",
      "status": "Pending"
    }
  ]
  ```

### 3. Admin Process Request (Approve/Reject)
- **Endpoint**: `POST /api/admin/handle-reset`
- **Access**: Private (Admin only)
- **Body**: 
  ```json
  {
    "userId": "organizerId",
    "action": "approve" | "reject",
    "adminComment": "Optional comment"
  }
  ```
- **Features**:
  - **Auto-generates secure password** (12 characters: uppercase, lowercase, numbers, symbols)
  - Returns generated password to admin
  - Hashes and stores new password in database
  - Adds entry to reset history
  - Clears pending request

### 4. View Reset History
- **Endpoint**: `GET /api/admin/reset-history/:userId`
- **Access**: Private (Admin only)
- **Returns**:
  ```json
  {
    "clubName": "Club Name",
    "email": "organizer@example.com",
    "history": [
      {
        "reason": "Forgot password",
        "requestedAt": "2026-02-08T...",
        "processedAt": "2026-02-08T...",
        "processedBy": { "_id": "adminId", "email": "admin@example.com" },
        "status": "Approved",
        "adminComment": "Verified identity",
        "generatedPassword": "Ab3$xY9zK2m!"
      }
    ]
  }
  ```

## Database Schema

### User Model Updates
```javascript
resetRequest: {
  reason: String,
  requestedAt: Date,
  status: ['None', 'Pending', 'Approved', 'Rejected']
},

resetHistory: [{
  reason: String,
  requestedAt: Date,
  processedAt: Date,
  processedBy: ObjectId (ref: User),
  status: ['Approved', 'Rejected'],
  adminComment: String,
  generatedPassword: String // Stored temporarily for admin
}]
```

## Usage Flow

### Organizer Side:
1. Organizer navigates to password reset request page
2. Enters detailed reason (why they need reset)
3. Submits request
4. Receives confirmation that admin will process
5. Waits for admin approval
6. Admin shares the new password via secure channel

### Admin Side:
1. Admin logs in to dashboard
2. Views "Password Reset Requests" section
3. Sees list of pending requests with:
   - Club name
   - Email
   - Reason
   - Request date
4. Reviews each request
5. Can view organizer's history (past resets)
6. Decides to approve or reject:
   - **Approve**: System auto-generates password, admin sees it and shares with organizer
   - **Reject**: Adds comment explaining why
7. Request moves to history

## Security Features

1. **Auto-Generated Passwords**: 
   - 12 characters long
   - Mix of uppercase, lowercase, numbers, symbols
   - Cryptographically random
   - Not reused from previous requests

2. **Password Storage**: 
   - Hashed with bcrypt (10 salt rounds)
   - Plain-text stored ONLY temporarily in history for admin reference
   - Organizer never chooses their own password

3. **Request Validation**:
   - Only organizers can request
   - Reason must be meaningful (10+ chars)
   - One pending request per organizer
   - All actions logged with timestamps

4. **Audit Trail**:
   - Complete history of all reset requests
   - Tracks who approved/rejected
   - Timestamps for accountability
   - Admin comments preserved

## API Testing Examples

### 1. Request Password Reset (as Organizer)
```bash
POST http://localhost:5000/api/auth/request-reset
Headers: Authorization: Bearer <organizer-token>
Body: {
  "reason": "I forgot my password and need access to manage my upcoming event"
}
```

### 2. View Pending Requests (as Admin)
```bash
GET http://localhost:5000/api/admin/reset-requests
Headers: Authorization: Bearer <admin-token>
```

### 3. Approve Request (as Admin)
```bash
POST http://localhost:5000/api/admin/handle-reset
Headers: Authorization: Bearer <admin-token>
Body: {
  "userId": "65f8a7b2c3d4e5f6a7b8c9d0",
  "action": "approve",
  "adminComment": "Identity verified via email"
}

Response: {
  "message": "Password reset approved successfully",
  "generatedPassword": "K7m$Zx9pQ2aB",
  "clubName": "Tech Club",
  "email": "techclub@example.com"
}
```

### 4. Reject Request (as Admin)
```bash
POST http://localhost:5000/api/admin/handle-reset
Headers: Authorization: Bearer <admin-token>
Body: {
  "userId": "65f8a7b2c3d4e5f6a7b8c9d0",
  "action": "reject",
  "adminComment": "Please verify your identity via official email first"
}
```

### 5. View Reset History (as Admin)
```bash
GET http://localhost:5000/api/admin/reset-history/65f8a7b2c3d4e5f6a7b8c9d0
Headers: Authorization: Bearer <admin-token>
```

## Frontend Integration (To Be Implemented)

### Organizer Dashboard:
- Add "Request Password Reset" button
- Modal to enter reason
- Display status of pending request
- Show past reset history (dates only, not passwords)

### Admin Dashboard:
- "Password Reset Requests" tab
- Table showing all pending requests
- Modal for approve/reject with comment field
- Display generated password prominently after approval
- Link to view organizer's reset history

## Completion Status

✅ **Backend Complete**:
- Request submission
- Admin viewing
- Approve/Reject with comments
- Auto-generate secure passwords
- Request history tracking
- Status tracking (Pending/Approved/Rejected)
- Audit logging

⏳ **Frontend To Do**:
- Organizer: Request reset form
- Organizer: View request status
- Admin: View pending requests table
- Admin: Approve/Reject modal
- Admin: View reset history
- Display generated password to admin

## Next Steps

1. Create frontend UI for organizer password reset request
2. Create admin UI for viewing and processing requests
3. Add real-time notifications (optional)
4. Add email notifications when request is processed (optional)
5. Test complete flow end-to-end
