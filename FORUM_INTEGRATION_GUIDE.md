# Discussion Forum Integration Guide

## Quick Integration

### Step 1: Import the Component

In both `ParticipantDashboard.js` and `OrganizerDashboard.js`:

```javascript
import DiscussionForum from '../components/DiscussionForum';
```

### Step 2: Add Forum to Event Details Section

#### For ParticipantDashboard.js:

Find the event details modal/section and add a new tab or section:

```javascript
{selectedEvent && (
  <div>
    {/* Existing event info */}
    
    {/* Add Forum Section */}
    <div style={{ marginTop: '30px' }}>
      <DiscussionForum 
        eventId={selectedEvent._id} 
        isOrganizer={false}
      />
    </div>
  </div>
)}
```

#### For OrganizerDashboard.js:

In the event details tab, add the forum:

```javascript
{activeTab === 'details' && selectedEventDetails && (
  <div>
    {/* Existing participant list, etc. */}
    
    {/* Add Forum Section */}
    <div style={{ marginTop: '30px' }}>
      <DiscussionForum 
        eventId={selectedEventDetails._id} 
        isOrganizer={true}
      />
    </div>
  </div>
)}
```

### Step 3: Test the Integration

1. **Start Backend** (if not already running):
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend** (if not already running):
   ```bash
   cd frontend
   npm start
   ```

3. **Test as Participant**:
   - Login as participant
   - Register for an event
   - Open event details
   - You should see the forum
   - Try posting a message
   - Try adding reactions
   - Try replying to messages

4. **Test as Organizer**:
   - Login as organizer
   - Open your event details
   - You should see the forum
   - Try posting an announcement
   - Try pinning a message
   - Try deleting messages
   - Try all participant features

## Alternative: Tabbed Interface

If you want the forum in a separate tab:

```javascript
const [activeDetailTab, setActiveDetailTab] = useState('info');

// Tab buttons
<div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
  <button 
    onClick={() => setActiveDetailTab('info')}
    style={{
      padding: '10px 20px',
      background: activeDetailTab === 'info' ? '#667eea' : '#e0e0e0',
      color: activeDetailTab === 'info' ? 'white' : '#333',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer'
    }}
  >
    📋 Info
  </button>
  <button 
    onClick={() => setActiveDetailTab('forum')}
    style={{
      padding: '10px 20px',
      background: activeDetailTab === 'forum' ? '#667eea' : '#e0e0e0',
      color: activeDetailTab === 'forum' ? 'white' : '#333',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer'
    }}
  >
    💬 Discussion Forum
  </button>
</div>

// Content
{activeDetailTab === 'info' && (
  <div>
    {/* Event info, participants, etc. */}
  </div>
)}

{activeDetailTab === 'forum' && (
  <DiscussionForum 
    eventId={selectedEvent._id} 
    isOrganizer={isOrganizer}
  />
)}
```

## Features Available

Once integrated, users will be able to:

### All Users:
- ✅ View messages in chronological order
- ✅ Post messages (up to 2000 characters)
- ✅ Reply to messages (threaded conversations)
- ✅ Add reactions (👍 ❤️ 💡 ❓ 🎉)
- ✅ Remove reactions
- ✅ View reply count
- ✅ Expand/collapse replies
- ✅ Delete own messages
- ✅ See unread count badge

### Organizers Only:
- ✅ Post announcements (highlighted in blue)
- ✅ Pin important messages (gold border, top position)
- ✅ Unpin messages
- ✅ Delete any message (moderation)
- ✅ All participant features

## Troubleshooting

### "Forum not showing"
- Check if backend is running
- Check browser console for errors
- Verify user is registered for the event
- Check network tab for API errors

### "Can't post message"
- Verify user is logged in
- Check if user is registered for the event
- Ensure message is not empty
- Check character limit (2000 max)

### "Reactions not working"
- Check if user is logged in
- Verify message exists
- Check network tab for API errors

### "Unread count not updating"
- Check if polling interval is running
- Verify localStorage is accessible
- Check browser console for errors

## Customization

### Change Poll Interval
In `DiscussionForum.js`, line ~176:
```javascript
// Change 10000 to desired milliseconds
const interval = setInterval(() => {
  fetchUnreadCount();
}, 10000); // 10 seconds
```

### Change Reactions
In `DiscussionForum.js`, line ~185:
```javascript
const reactionEmojis = {
  like: '👍',
  love: '❤️',
  helpful: '💡',
  question: '❓',
  celebrate: '🎉'
  // Add more...
};
```

### Change Character Limit
In `forumController.js`, line ~94:
```javascript
if (content.length > 2000) {
  // Change 2000 to desired limit
}
```

And in `ForumMessage.js` model, line ~12:
```javascript
maxlength: 2000 // Change here too
```

## Security Notes

- ✅ Only registered participants can access forum
- ✅ Only organizers can post announcements
- ✅ Only organizers can pin messages
- ✅ Users can only delete their own messages (except organizers)
- ✅ All API endpoints require authentication
- ✅ Event ownership verified for moderation actions
- ✅ Soft delete preserves data integrity

## Performance Tips

1. **Pagination**: Currently loads 50 messages. To add "Load More":
   ```javascript
   const [skip, setSkip] = useState(0);
   const loadMore = () => setSkip(prev => prev + 50);
   ```

2. **Caching**: Messages are fetched on mount. Add dependency array to prevent unnecessary fetches.

3. **Optimistic Updates**: Update UI immediately, then sync with server for better UX.

## Next Steps

1. ✅ Backend complete
2. ✅ Frontend component complete
3. ⏳ Integrate into ParticipantDashboard
4. ⏳ Integrate into OrganizerDashboard
5. ⏳ Test all features
6. ⏳ Deploy to production

---

**Ready to use!** Just follow the integration steps above and the forum will be live in your event details pages. 🎉
