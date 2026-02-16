# 🔍 Debug Instructions for Event Registration & Email Issues

## Changes Made:

### ✅ Added Extensive Logging to Backend

**Location:** `backend/controllers/eventController.js` & `backend/routes/eventRoutes.js`

**Logs Added:**
1. **Registration Start** - Shows event ID and user ID
2. **Event & User Found** - Confirms database lookups
3. **Validation Steps** - Shows if limits, stock, or duplicates are blocking
4. **Participant Added** - Confirms participant added to event
5. **Event Saved** - Confirms database save
6. **Email Sending** - Shows email preparation and result
7. **Ticket Storage** - Shows if ticket saved to user profile
8. **Registration Complete** - Final success message
9. **My Registrations Fetch** - Shows how many events found

### 📝 How to Test:

## Step 1: Restart Backend Server

```bash
cd /home/pranjal-garg/Desktop/Dass_A1/backend
# Stop current server (Ctrl+C)
npm run dev
```

**Look for this log:**
```
📧 Using Gmail SMTP with user: felicity21dass@gmail.com
```

## Step 2: Register for an Event

1. **Frontend:** Navigate to "All Events" tab
2. **Click** on any event
3. **Click** "Register Now"
4. **Watch Backend Terminal** for these logs:

```
🔵 ===== REGISTRATION STARTED =====
📝 Event ID: ...
👤 User ID: ...
📅 Event Found: [Event Name]
👤 User Found: [User Name]
✅ Validation passed, adding participant...
💾 Saving event with new participant...
✅ Event saved successfully
📊 Total participants now: X
📧 Checking if email should be sent...
Event type: Normal
📧 Preparing to send email ticket...
📧 Calling sendEventTicket function...
📧 Using Gmail SMTP with user: felicity21dass@gmail.com
🎟️ Generated Ticket ID: TICKET-...
📤 Sending email...
✅ Email sent successfully!
📧 Message ID: ...
📧 Email send result: { success: true, ticketId: '...', messageId: '...' }
💾 Storing ticket in user profile...
✅ Ticket stored in user profile
✅ Registration complete, sending response...
🔵 ===== REGISTRATION ENDED =====
```

## Step 3: Check "My Events" Tab

1. **Navigate** to "My Events" tab
2. **Backend Terminal** should show:
```
📋 Fetching registered events for user: ...
✅ Found X registered events
```

3. **Frontend** should display:
   - Event card with green "✓ Registered" badge
   - Ticket ID displayed
   - "📧 Ticket Sent" badge

## Step 4: Check Email

1. **Open** the email inbox for the participant's email
2. **Check** spam folder if not in inbox
3. **Subject:** "🎟️ Event Ticket - [Event Name]"
4. **Content:** Beautiful HTML ticket with all event details

---

## 🐛 Troubleshooting:

### Problem 1: Registration Not Saving

**Symptoms:**
- Registration success message appears
- But "My Events" tab is empty
- Backend logs show "Event saved successfully" but...

**Check:**
```bash
# Look for this in backend logs:
💾 Saving event with new participant...
✅ Event saved successfully
📊 Total participants now: X
```

**If missing:** Event.save() failed silently
**Solution:** Check MongoDB connection

### Problem 2: Email Not Sending

**Symptoms:**
- Registration works
- But no email received
- Backend logs show email error

**Common Errors:**

#### Error: "Invalid login"
```
❌ Error sending ticket email:
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Fix:** App password is wrong. Regenerate at https://myaccount.google.com/apppasswords

#### Error: "Connection timeout"
```
❌ Error sending ticket email:
Error: Connection timeout
```
**Fix:** Firewall blocking port 587. Try different network or use port 465 with `EMAIL_SECURE=true`

#### Error: "Email transporter not configured"
```
⚠️ Email transporter not configured, skipping email send
```
**Fix:** Check `.env` file has:
```
EMAIL_USER=felicity21dass@gmail.com
EMAIL_PASS=aetlrjdluhraqfpt
```

### Problem 3: "My Events" Tab Empty

**Symptoms:**
- Registration successful
- Email sent
- But "My Events" tab shows "No events"

**Debug Steps:**

1. **Check backend logs** when opening "My Events":
```
📋 Fetching registered events for user: 673...
✅ Found 0 registered events  <-- Problem: Should be > 0
```

2. **Check database directly:**
```bash
# If you have MongoDB Compass or shell access
# Find events where participants array contains user ID
db.events.find({ participants: ObjectId("YOUR_USER_ID") })
```

3. **Check if user ID is correct:**
   - Frontend localStorage should have user token
   - Backend should decode correct user ID from token

### Problem 4: Duplicate Registration Error

**Symptoms:**
- Click register multiple times
- Get error: "You are already registered"

**This is correct behavior!** Check backend logs:
```
❌ User already registered
```

To test again, unregister first or use a different event.

---

## 🔬 Advanced Debugging:

### Check .env File:
```bash
cd /home/pranjal-garg/Desktop/Dass_A1/backend
cat .env | grep EMAIL
```

Should show:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=felicity21dass@gmail.com
EMAIL_PASS=aetlrjdluhraqfpt
EMAIL_FROM="Felicity Events <felicity21dass@gmail.com>"
```

### Test Email Directly:
Create `backend/testEmail.js`:
```javascript
require('dotenv').config();
const { sendEventTicket } = require('./utils/emailService');

const testData = {
  participantData: {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com' // Change to your email
  },
  eventData: {
    name: 'Test Event',
    type: 'Normal',
    startDate: new Date(),
    endDate: new Date(),
    venue: 'Test Venue',
    organizerName: 'Test Organizer',
    registrationFee: 100,
    eligibility: 'All'
  }
};

sendEventTicket(testData.participantData, testData.eventData)
  .then(result => {
    console.log('Test result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
```

Run:
```bash
node backend/testEmail.js
```

---

## ✅ Expected Working Flow:

1. **User registers for event**
2. **Backend logs show:**
   - Registration started
   - Event found
   - User found
   - Participant added
   - Event saved
   - Email sent
   - Ticket stored
   - Registration complete

3. **Frontend shows:**
   - Success alert with ticket ID
   - Event appears in "My Events"
   - Green "✓ Registered" badge in "All Events"
   - Ticket ID displayed

4. **Email received:**
   - Professional HTML ticket
   - Contains ticket ID
   - Shows all event details

5. **Database updated:**
   - Event.participants array includes user ID
   - User.eventTickets array includes ticket

---

## 🚨 Critical Files:

- `backend/.env` - Email credentials
- `backend/controllers/eventController.js` - Registration logic
- `backend/routes/eventRoutes.js` - API endpoints
- `backend/utils/emailService.js` - Email sending
- `backend/models/User.js` - User schema with eventTickets
- `frontend/src/pages/ParticipantDashboard.js` - UI display

---

## 📞 Next Steps:

1. **Restart backend server** with `npm run dev`
2. **Register for an event**
3. **Read the terminal logs carefully**
4. **Take a screenshot** of any errors
5. **Check email inbox** (and spam folder)
6. **Verify "My Events" tab** updates

If still not working, share the backend terminal logs for debugging!
