# Smart Event & Club Recommendation Algorithm

## Overview
An intelligent multi-factor sorting and filtering system that personalizes the participant dashboard based on their interests, followed clubs, and engagement patterns.

---

## Algorithm Components

### 1. **Event Sorting Algorithm**

Events are sorted using a **relevance scoring system** with the following factors:

#### **Scoring Breakdown:**

| Factor | Score | Description |
|--------|-------|-------------|
| **Category Match** | 100 points | Event category matches user's interests (e.g., "Dance" event for user interested in "Dance") |
| **Name Match** | 50 points | Event name contains user's interest keywords |
| **From Followed Club** | 75 points | Event organized by a club the user follows |
| **Tag Match** | 25 points per tag | Event tags that match user interests (multiplicative) |

#### **Example Calculation:**

**User Interests:** `["Dance", "Music", "Technical"]`

**Event A: "Dance Competition"**
- Category: "Cultural Club" → No match (0)
- Name: Contains "Dance" → Match (50)
- Organizer: "dancecrew" (followed) → Match (75)
- Tags: ["Dance", "Performance"] → 1 match (25)
- **Total Score: 150**

**Event B: "Tech Hackathon"**
- Category: "Technical" → Match (100)
- Name: Contains "Tech" → Match (50)
- Organizer: Not followed (0)
- Tags: ["Coding", "Technical"] → 1 match (25)
- **Total Score: 175**

**Result:** Event B appears first! ⭐

#### **Secondary Sorting:**
If two events have the same score, they're sorted by **date** (upcoming events first).

---

### 2. **Club Sorting Algorithm**

Clubs are sorted with a **priority-based system**:

#### **Priority Order:**

1. **Followed Clubs** (Highest Priority)
   - Clubs you already follow appear at the top
   - Easy access to your favorite organizers

2. **Category Match**
   - Club category matches your interests
   - E.g., "Cultural Club" for users interested in "Dance" or "Music"

3. **Name Match**
   - Club name contains your interest keywords
   - E.g., "Tech Club" for users interested in "Technical"

4. **Popularity**
   - Sorted by follower count (most popular first)
   - Helps discover trending clubs

---

### 3. **Visual Indicators**

Events are marked with badges to explain why they're recommended:

#### **⭐ Top Pick**
- Top 3 events with highest relevance scores
- Golden badge with pulsing animation
- Purple border around the card
- Enhanced shadow effect

#### **💜 From Followed Club**
- Events from clubs you follow
- Purple gradient badge
- Ensures you never miss events from your favorite organizers

#### **✨ Matches Your Interest**
- Events matching your interest categories
- Purple gradient badge
- Helps discover new events aligned with your preferences

---

## Implementation Details

### **Data Flow:**

```
1. User logs in
   ↓
2. Fetch user profile (interests, followedClubs)
   ↓
3. Fetch all events and organizers
   ↓
4. Apply scoring algorithm
   ↓
5. Sort events by relevance score
   ↓
6. Sort clubs by priority
   ↓
7. Add visual badges to top picks
   ↓
8. Render personalized dashboard
```

### **Key Features:**

✅ **Case-Insensitive Matching**
- "Dance" matches "dance", "DANCE", "Dance"

✅ **Partial Matching**
- "Tech" matches "Technical", "Technology", "Tech Club"

✅ **Multi-Factor Scoring**
- Considers category, name, organizer, and tags together

✅ **Real-Time Updates**
- Following/unfollowing instantly re-sorts the list
- Changing interests in onboarding updates recommendations

✅ **Search Integration**
- Sorting applies after search filtering
- Maintains personalization within search results

---

## Examples

### **Scenario 1: New User with Interests**

**User:** John (Interests: Dance, Music)
**Dashboard Order:**

1. ⭐ **Dance Competition** (Score: 175)
   - Category: Cultural ✓
   - From: dancecrew (followed) ✓
   - Badge: "Top Pick"

2. ⭐ **Music Fest 2026** (Score: 150)
   - Name: "Music" ✓
   - Category: Cultural ✓
   - Badge: "Top Pick"

3. **Art Exhibition** (Score: 50)
   - Category: Cultural (partial match)

4. **Tech Hackathon** (Score: 0)
   - No match with user interests

---

### **Scenario 2: User Following Clubs**

**User:** Sarah (Follows: Lit Club, ArtSoc)
**Dashboard Order:**

1. 💜 **Poetry Slam** (Lit Club)
   - Badge: "From Followed Club"

2. 💜 **Art Workshop** (ArtSoc)
   - Badge: "From Followed Club"

3. **Other Events...**

---

### **Scenario 3: Multiple Interests**

**User:** Alex (Interests: Technical, Sports, Music)
**Dashboard Order:**

Events matching multiple interests get **higher scores**:
- Technical + Music event → 200+ points
- Sports + Technical event → 175+ points
- Single interest match → 100-150 points

---

## Benefits

### **For Participants:**
✅ See relevant events first
✅ Discover events matching their interests
✅ Never miss events from followed clubs
✅ Save time browsing through irrelevant content
✅ Clear visual indicators explaining recommendations

### **For Organizers:**
✅ Events reach the right audience
✅ Higher engagement from interested participants
✅ Better event attendance
✅ Increased club visibility

---

## Technical Notes

### **Performance:**
- Sorting happens client-side (no additional API calls)
- O(n log n) complexity for sorting
- Debounced search (300ms delay)
- Efficient re-rendering with React

### **Scalability:**
- Works with any number of interests (1-10+)
- Handles 100+ events efficiently
- No database changes required
- Pure JavaScript sorting

### **Future Enhancements:**
- Machine learning based recommendations
- Event click tracking for better personalization
- Collaborative filtering ("Users like you also liked...")
- Time-based relevance (events happening soon get boost)
- Location-based recommendations

---

## Testing

### **Test Case 1: No Interests**
- Result: Events sorted by date
- No badges shown
- All users see same order

### **Test Case 2: One Interest**
- Result: Matching events appear first
- Top 3 get "Top Pick" badge
- Others sorted by date

### **Test Case 3: Multiple Interests**
- Result: Events matching more interests rank higher
- Multiple badges possible
- Best matches at top

### **Test Case 4: Followed Clubs**
- Result: Events from followed clubs boosted +75 points
- "From Followed Club" badge shown
- Appears in top section

---

## Summary

The algorithm creates a **truly personalized experience** by:
1. Scoring events based on multiple relevance factors
2. Prioritizing content from followed clubs
3. Providing visual feedback on why content is recommended
4. Maintaining performance and scalability
5. Updating dynamically as user preferences change

This ensures participants see the most relevant content first, improving engagement and satisfaction! 🎉
