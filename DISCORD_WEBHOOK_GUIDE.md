# Discord Webhook Integration Guide

## Overview
The system automatically posts new events to Discord when they are **published** by organizers. This works through Discord webhooks.

---

## How to Set Up Discord Webhook

### Step 1: Create a Discord Webhook URL

1. **Open Discord** and go to the server/channel where you want event notifications
2. Click the **channel settings** gear icon (⚙️)
3. Go to **Integrations** → **Webhooks**
4. Click **Create Webhook** or **New Webhook**
5. **Customize the webhook**:
   - Name: `Event Bot` or `Felicity Events`
   - Channel: Select the channel where events will be posted
   - Avatar: (Optional) Upload an icon
6. **Copy the Webhook URL** — it looks like:
   ```
   https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
   ```
7. Click **Save**

---

### Step 2: Add Webhook URL to Organizer Profile

#### Option A: Through Admin Dashboard (Recommended)
1. Login as **Admin** (`admin@felicity.com` / `admin123`)
2. Go to **Manage Organizers** tab
3. Find the organizer and click **Edit**
4. Paste the Discord Webhook URL in the **Discord Webhook** field
5. Click **Save**

#### Option B: Through Organizer Profile (If implemented)
1. Login as the **Organizer**
2. Go to **Profile Settings** tab (if available)
3. Paste the Discord Webhook URL in the **Discord Webhook** field
4. Click **Save**

#### Option C: Directly in Database (Advanced)
```javascript
// Connect to MongoDB
db.users.updateOne(
  { email: "organizer@example.com" },
  { $set: { discordWebhook: "https://discord.com/api/webhooks/YOUR_WEBHOOK_URL" } }
)
```

---

### Step 3: Publish an Event

Once the webhook URL is configured:

1. **Create an event** as an organizer
2. Fill in all required fields (name, description, venue, deadline, etc.)
3. Click **🚀 Publish Event**

The event will be **automatically posted to Discord** with a rich embed containing:
- Event name and description
- Type (Normal/Team/Merchandise)
- Registration fee
- Number of spots
- Venue
- Date and deadline
- Organizer name
- A "Register Now" link (if you add your frontend URL to the Discord webhook utility)

---

## What Gets Posted to Discord?

When an event is **published**, Discord receives a rich embed message with:

### Event Card Includes:
- **Title**: Event name
- **Description**: Event description (truncated to 300 characters)
- **Fields**:
  - 📅 Type (Normal/Team/Merchandise)
  - 💰 Registration Fee (or "Free")
  - 👥 Spots Available
  - 📍 Venue
  - 🕐 Event Date
  - ⏰ Registration Deadline
- **Footer**: Organizer name
- **Color**: Purple branding (`#667eea`)
- **Timestamp**: When the event was published

### Example Discord Message:
```
🎉 New Event Published!

[Rich Embed Card]
📅 Hackathon 2026
Build innovative solutions in 24 hours!

📅 Type: Team
💰 Fee: ₹500
👥 Spots: 50
📍 Venue: Tech Park Auditorium
🕐 Date: Saturday, February 15, 2026
⏰ Registration Deadline: Mon, Feb 10, 2026, 11:59 PM

Organizer: Tech Club • Just now
```

---

## When Does Discord Posting Trigger?

Discord webhook is called in **two scenarios**:

### 1. **Direct Publish** (Create + Publish)
When an organizer creates an event and clicks **"🚀 Publish Event"** directly

### 2. **Draft → Published**
When an organizer:
- Saves an event as **Draft**
- Later clicks **"Publish"** on the draft event
- Or edits the event and changes status from `Draft` to `Published`

---

## Troubleshooting

### ❌ Event not appearing in Discord?

**Check:**
1. ✅ Is the **Discord Webhook URL** saved in the organizer's profile?
2. ✅ Is the event **Published** (not Draft)?
3. ✅ Is the webhook URL valid and active in Discord?
4. ✅ Check backend console logs for errors:
   ```
   📢 Posting event to Discord...
   ✅ Discord webhook sent successfully
   ```

### ⚠️ Discord webhook failed but event still published?

This is **expected behavior** — the event publishing will **not fail** even if Discord webhook fails. The event will still be created/published successfully.

Check logs for:
```
⚠️ Discord webhook failed: [error message]
```

Common errors:
- **Invalid webhook URL**: Double-check the URL format
- **Webhook deleted**: The webhook was deleted from Discord
- **Rate limit**: Too many requests (Discord limits: 30 requests/min per webhook)
- **Network error**: Backend cannot reach Discord servers

---

## Testing

### Test the Discord Webhook:

1. **Create a test event**:
   - Name: "Test Event"
   - Description: "Testing Discord integration"
   - Fill in required fields
   - Click **"🚀 Publish Event"**

2. **Check Discord channel** — you should see the event appear within seconds

3. **Check backend logs**:
   ```
   📢 Posting event to Discord...
   🔗 Webhook URL: https://discord.com/api/webhooks/...
   ✅ Discord webhook sent successfully
   ```

---

## Security Notes

⚠️ **Keep webhook URLs private!**
- Do NOT share webhook URLs publicly
- Anyone with the URL can post to your Discord channel
- If leaked, delete the webhook in Discord and create a new one

⚠️ **Webhook permissions:**
- Webhooks can only post to the channel they're configured for
- They cannot read messages or access other channels
- They cannot perform admin actions

---

## Customization

To customize the Discord message format, edit:
```
backend/utils/discordWebhook.js
```

You can modify:
- Embed color
- Field layout
- Description length
- Footer text
- Add buttons/links (requires Discord API changes)

---

## Admin Credentials

**Admin Portal**: `http://localhost:3000/admin`
- Email: `admin@felicity.com`
- Password: `admin123`

Use the admin portal to manage organizer profiles and add Discord webhook URLs.

---

## Database Schema

The `discordWebhook` field is stored in the **User** model for organizers:

```javascript
{
  email: "organizer@example.com",
  role: "Organizer",
  organizerName: "Tech Club",
  discordWebhook: "https://discord.com/api/webhooks/..." // Optional
}
```

---

## Implementation Details

### Backend Files:
- **Webhook Utility**: `backend/utils/discordWebhook.js`
- **Event Controller**: `backend/controllers/eventController.js` (create event)
- **Event Routes**: `backend/routes/eventRoutes.js` (update event status)

### Flow:
1. Organizer publishes event (status = "Published")
2. Backend checks if `organizer.discordWebhook` exists
3. If yes, calls `sendEventToDiscord(webhookUrl, event, organizerName)`
4. Utility formats event data into Discord embed
5. Sends POST request to Discord webhook URL
6. Discord posts the message to the configured channel

---

## Future Enhancements

Possible improvements:
- ✨ Real-time registration count updates in Discord
- ✨ Event reminder notifications (1 day before)
- ✨ "Event Full" notifications
- ✨ Button to register directly from Discord (requires Discord bot)
- ✨ Multiple webhook URLs per organizer (different channels)
- ✨ Webhook URL validation before saving

---

## Support

For issues or questions:
1. Check backend console logs
2. Verify webhook URL is correct in organizer profile
3. Test webhook manually using Discord's webhook documentation
4. Check Discord server permissions

---

**Last Updated**: February 8, 2026
