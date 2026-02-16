# Profile Editing & Discord Integration Guide

## ✅ Implemented Features

### 1. **Admin Dashboard - Create Organizer Account**
When creating a new club/organizer account, the admin can now set:
- Club Name
- Login Email
- Temporary Password
- Category
- Contact Number
- Description
- **Discord Webhook URL** (optional)

**Location:** Admin Dashboard → "Provision New Club Account" section

---

### 2. **Organizer Dashboard - Profile Settings Tab**
Organizers can edit their own profile information:

#### **Editable Fields:**
- ✅ Club Name
- ✅ Category
- ✅ Description
- ✅ Contact Number
- ✅ Contact Email
- ✅ Discord Webhook URL

#### **Non-Editable Fields:**
- 🔒 Login Email (must contact admin to change)

**Location:** Organizer Dashboard → Click "⚙️ Profile" in the top navigation

---

## 🔔 Discord Integration

### How It Works:
1. **Admin or Organizer sets Discord Webhook URL** in profile settings
2. When an event is **published** (status changes from Draft → Published):
   - System automatically posts to Discord server
   - Posts include: Event Name, Description, Dates, Venue, Registration Details
   - Rich embed format with color coding

### How to Get Discord Webhook URL:

**Step-by-Step:**
1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **"New Webhook"** or **"Create Webhook"**
4. Give it a name (e.g., "Event Notifications")
5. Select the channel where events should be posted
6. Click **"Copy Webhook URL"**
7. Paste the URL in:
   - Admin Dashboard (when creating organizer account), OR
   - Organizer Dashboard → Profile → Discord Webhook URL field

**Example Webhook URL format:**
```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

### When Events Are Posted:
- ✅ New event created with status "Published"
- ✅ Event status changed from "Draft" to "Published"
- ❌ NOT posted for Draft events
- ❌ NOT posted for status changes to Ongoing/Closed

---

## 🔧 Backend Changes Made

### User Schema Updates (`backend/models/User.js`):
```javascript
contactEmail: { type: String }  // Public contact email (different from login email)
contactNumber: { type: String }
discordWebhook: { type: String }  // Discord webhook URL for auto-posting
```

### New Routes (`backend/routes/userRoutes.js`):
```javascript
PUT /api/users/profile  // Update organizer profile (requires authentication)
```

### Login Response Enhancement:
Login now returns organizer-specific fields:
- `organizerName`
- `category`
- `description`
- `contactNumber`
- `contactEmail`
- `discordWebhook`

### Discord Webhook Utility (`backend/utils/discordWebhook.js`):
- `postEventToDiscord(event, organizerId)` - Posts event to Discord
- Fetches organizer's webhook URL from database
- Sends rich embed with event details
- Handles errors gracefully (doesn't block event creation if Discord fails)

### Event Creation Integration:
When event is created with status "Published" or status updated to "Published":
```javascript
// Auto-post to Discord
await postEventToDiscord(event, req.user.id);
```

---

## 📋 Testing Checklist

### Test Profile Editing:
1. ✅ Login as organizer
2. ✅ Go to Profile tab
3. ✅ Click "Edit Profile"
4. ✅ Change Name, Category, Description, Contact fields
5. ✅ Add Discord Webhook URL
6. ✅ Click "Save Changes"
7. ✅ Verify changes are saved (refresh page)
8. ✅ Verify Login Email is non-editable

### Test Discord Integration:
1. ✅ Set up Discord webhook in profile
2. ✅ Create a new event with status "Published"
3. ✅ Check Discord channel - event should appear
4. ✅ Create Draft event - should NOT post to Discord
5. ✅ Change Draft event to Published - should post to Discord
6. ✅ If webhook URL is invalid/empty - event should still be created (Discord posting fails silently)

### Test Admin Panel:
1. ✅ Login as admin (admin@felicity.com / admin123)
2. ✅ Create new organizer account
3. ✅ Fill all fields including Discord Webhook URL
4. ✅ Verify account is created
5. ✅ Login as the new organizer
6. ✅ Check Profile tab - all fields should be populated

---

## 🚨 Common Issues & Fixes

### Issue: "Discord posting failed"
**Cause:** Invalid webhook URL or Discord server not accessible
**Fix:** 
- Verify webhook URL is correct format
- Test webhook URL directly using curl:
  ```bash
  curl -X POST "YOUR_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"content": "Test message"}'
  ```

### Issue: Profile changes not saving
**Cause:** Backend route not accessible or authentication issue
**Fix:**
- Check backend is running on port 5000
- Verify JWT token is valid
- Check browser console for errors

### Issue: Login email showing as editable
**Cause:** UI bug
**Fix:** Check the Profile tab code - Login Email field should have `disabled` or be rendered as static text with background color `#f5f5f5`

---

## 🎯 Feature Summary

✅ **Organizer Profile Editing:** Name, Category, Description, Contact Email/Number  
✅ **Discord Auto-Posting:** Events auto-post when published  
✅ **Admin Control:** Admin can set Discord webhook when creating organizer accounts  
✅ **Secure:** Login email is non-editable, requires admin intervention  
✅ **User-Friendly:** Clear UI with instructions for Discord setup  
✅ **Error Handling:** Discord failures don't block event creation  

---

## 📞 Support

For issues or questions:
1. Check backend logs: `npm run dev` in `/backend` directory
2. Check frontend console: Browser DevTools → Console tab
3. Verify database connection: Check MongoDB Atlas cluster status
4. Test Discord webhook independently before integrating

**Admin Credentials:**
- Email: admin@felicity.com
- Password: admin123

**Backend Port:** 5000  
**Frontend Port:** 3000/3001
