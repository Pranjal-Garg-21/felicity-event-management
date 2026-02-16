# 👁️ Attendance Tracking - Visual Guide for Organizers

## 📱 Where to Find Attendance Information

### Step 1: Open Event Details
- Go to **OrganizerDashboard**
- Click on any published event card
- Event details modal opens

### Step 2: View Participants Section
Located in the event details modal, you'll see:

```
┌─────────────────────────────────────────────────────────────────────┐
│  👥 Registered Participants (15)                                     │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ ✅ Attended  │  │ ⏳ Not Yet   │  │ 📊 Export CSV            │  │
│  │     8        │  │     7        │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: Filter Participants
Click on filter buttons to view specific groups:

```
┌────────────────────────────────────────────────────────┐
│  [All (15)]  [✅ Attended (8)]  [⏳ Not Yet Arrived (7)] │
└────────────────────────────────────────────────────────┘
```

### Step 4: View Attendance Table

**When "All" is selected:**
```
┌──┬─────────────────┬───────────────────┬────────────┬─────────────┬──────────────────────────┐
│# │ Name            │ Email             │ Contact    │ College     │ Attendance Status        │
├──┼─────────────────┼───────────────────┼────────────┼─────────────┼──────────────────────────┤
│1 │ John Doe        │ john@email.com    │ 9876543210 │ IIIT Delhi  │ ✅ Attended              │
│  │                 │                   │            │             │ 2/8/2026, 10:30:15 AM    │
├──┼─────────────────┼───────────────────┼────────────┼─────────────┼──────────────────────────┤
│2 │ Jane Smith      │ jane@email.com    │ 9876543211 │ IIT Delhi   │ ⏳ Not Yet Arrived       │
├──┼─────────────────┼───────────────────┼────────────┼─────────────┼──────────────────────────┤
│3 │ Mike Johnson    │ mike@email.com    │ 9876543212 │ DTU         │ ✅ Attended              │
│  │                 │                   │            │             │ 2/8/2026, 10:45:22 AM    │
└──┴─────────────────┴───────────────────┴────────────┴─────────────┴──────────────────────────┘
```

**When "✅ Attended" filter is active:**
Only shows participants who have scanned their QR codes (8 people)

**When "⏳ Not Yet Arrived" filter is active:**
Only shows participants who haven't scanned yet (7 people)

---

## 🎯 Real-Time Updates

### Before QR Scan:
```
Participant: Sarah Williams
Status: ⏳ Not Yet Arrived
```

### After QR Scan (automatically updates):
```
Participant: Sarah Williams
Status: ✅ Attended
       2/8/2026, 11:15:30 AM
```

The counts also update automatically:
- ✅ Attended: 8 → 9
- ⏳ Not Yet: 7 → 6

---

## 📊 Export CSV

### When you click "📊 Export CSV", you get:

**Filename:** `Wall_Painting_Attendance_2026-02-08.csv`

**Contents:**
```csv
#,Name,Email,Contact,College,Attendance Status,Scanned At
1,"John Doe","john@email.com","9876543210","IIIT Delhi","Attended","2/8/2026, 10:30:15 AM"
2,"Jane Smith","jane@email.com","9876543211","IIT Delhi","Not Yet Arrived","N/A"
3,"Mike Johnson","mike@email.com","9876543212","DTU","Attended","2/8/2026, 10:45:22 AM"
...
```

---

## 📱 Mobile View

On mobile devices, the table is horizontally scrollable and the stats/buttons stack vertically:

```
┌──────────────────────────────┐
│ 👥 Registered (15)           │
├──────────────────────────────┤
│ ✅ Attended: 8               │
│ ⏳ Not Yet: 7                │
│ 📊 Export CSV                │
├──────────────────────────────┤
│ [All] [Attended] [Not Yet]   │
├──────────────────────────────┤
│ [Scrollable Table →]         │
└──────────────────────────────┘
```

---

## 🔄 How Attendance Gets Marked

### Method 1: QR Scanner (Primary)
1. Organizer clicks "📱 Open QR Scanner"
2. Participant shows QR ticket
3. Organizer scans with camera OR uploads image
4. ✅ Success! Participant marked as attended
5. Dashboard updates automatically

### Method 2: Manual Override (Exceptional Cases)
1. In QR Scanner, click "Manual Override"
2. Search for participant name
3. Enter reason (e.g., "QR code damaged")
4. Confirm action
5. Participant marked as attended with audit log

---

## 💡 Color Coding

- **Green (✅)** = Attended, everything is good
- **Orange (⏳)** = Not yet arrived, waiting
- **Blue** = Actions (Export, Scan)

---

## 📈 Real-Time Scenario

**10:00 AM - Event Starts:**
```
✅ Attended: 0
⏳ Not Yet: 15
```

**10:30 AM - First participants arrive:**
```
✅ Attended: 5
⏳ Not Yet: 10
```

**11:00 AM - More arrivals:**
```
✅ Attended: 12
⏳ Not Yet: 3
```

**11:30 AM - Event fully attended:**
```
✅ Attended: 15
⏳ Not Yet: 0
```

Each time you refresh or a scan happens, the numbers update automatically!

---

## ✨ Key Features Visible to You

1. **Live Counts** - See at a glance how many attended
2. **Easy Filtering** - One click to see who's missing
3. **Timestamps** - Know exactly when each person arrived
4. **Quick Export** - Download full report anytime
5. **Clean Design** - Color-coded badges for quick understanding
6. **No Refresh Needed** - Updates happen automatically

---

## 🎓 Summary

**Location:** OrganizerDashboard → Event Details → Participants Section

**What You See:**
- Total participant count
- Attended count (green)
- Not yet arrived count (orange)
- Filter buttons
- Full table with attendance status and timestamps
- Export CSV button

**What It Does:**
- Shows real-time attendance as participants get scanned
- Lets you filter to see specific groups
- Displays scan timestamps
- Allows CSV export for records

**Status:** ✅ Fully Functional & Ready to Use!
