# Flexible Event Creation System Documentation

## Overview
The event creation system now supports **flexible event sessions** and **custom registration fields**, allowing organizers to create complex events with multiple date/time slots and collect custom data from participants.

## Key Features

### 1. Mandatory Fields (Always Required)
These fields MUST be filled for every event:

- **Event Name** - The title of the event
- **Event Description** - Detailed description of what the event is about
- **Event Type** - Normal / Team / Merchandise
- **Eligibility** - Who can participate (e.g., "All Students", "BTech only")
- **Registration Limit** - Maximum number of participants/teams
- **Registration Fee** - Cost per participant (₹)
- **Venue** - Main location of the event
- **Registration Deadline** - Last date/time for registration
- **At least ONE Event Session** - Start/End date required

### 2. Team Event Additional Mandatory Fields
When creating a Team event, these become mandatory:

- **Minimum Team Size** - e.g., 2 members
- **Maximum Team Size** - e.g., 4 members

### 3. Flexible Event Sessions

#### Purpose
Events can now span multiple days/times with different sessions. Perfect for:
- Multi-day workshops (Day 1: 2-5pm, Day 2: 2-5pm)
- Events with morning and evening sessions
- Tournaments with multiple rounds
- Week-long events with daily sessions

#### Features
- **Add Multiple Sessions**: Click "+ Add Session" to add more
- **Remove Sessions**: Delete any session (minimum 1 required)
- **Per-Session Fields**:
  - Session Name (optional) - e.g., "Day 1", "Opening Ceremony", "Finals"
  - Start Date * (required)
  - Start Time (optional, defaults to 00:00)
  - End Date * (required)
  - End Time (optional, defaults to 23:59)
  - Venue (optional, overrides main venue for this session)

#### Example Use Cases

**Example 1: Two-Day Workshop**
```
Session 1:
- Name: "Day 1 - Introduction"
- Start: 2024-03-15, 14:00 (2:00 PM)
- End: 2024-03-15, 17:00 (5:00 PM)
- Venue: "Room 301"

Session 2:
- Name: "Day 2 - Advanced Topics"
- Start: 2024-03-16, 14:00 (2:00 PM)
- End: 2024-03-16, 17:00 (5:00 PM)
- Venue: "Room 301"
```

**Example 2: Hackathon**
```
Session 1:
- Name: "Opening Ceremony"
- Start: 2024-04-20, 09:00
- End: 2024-04-20, 10:00
- Venue: "Auditorium"

Session 2:
- Name: "Hacking Session"
- Start: 2024-04-20, 10:00
- End: 2024-04-21, 10:00
- Venue: "Tech Lab"

Session 3:
- Name: "Presentations & Closing"
- Start: 2024-04-21, 14:00
- End: 2024-04-21, 18:00
- Venue: "Auditorium"
```

### 4. Custom Registration Fields

#### Purpose
Collect additional information from participants beyond the standard fields. Completely optional - organizer decides what extra data to collect.

#### Available Field Types
1. **Text Input** - Free text entry (e.g., "Any dietary restrictions?")
2. **Number** - Numeric input (e.g., "Years of experience")
3. **Date** - Date picker (e.g., "Date of Birth")
4. **Email** - Email validation (e.g., "Emergency contact email")
5. **Phone** - Phone number (e.g., "Contact number")
6. **Dropdown** - Select from options (e.g., "T-Shirt Size: S, M, L, XL")
7. **Checkbox** - Yes/No (e.g., "Agree to terms")

#### Features
- **Add Fields**: Click "+ Add Field" to create new custom field
- **Remove Fields**: Delete any custom field
- **Per-Field Configuration**:
  - Field Name (e.g., "T-Shirt Size")
  - Field Type (dropdown selection)
  - Placeholder Text (optional hint)
  - Required Checkbox (make field mandatory)
  - Options (for Dropdown type - comma separated)

#### Example Custom Fields

**Example 1: Tech Workshop**
```
Field 1:
- Name: "Programming Experience"
- Type: Dropdown
- Options: "Beginner, Intermediate, Advanced"
- Required: Yes

Field 2:
- Name: "Preferred Programming Language"
- Type: Text
- Placeholder: "e.g., Python, Java, C++"
- Required: No

Field 3:
- Name: "Laptop Available"
- Type: Checkbox
- Required: Yes
```

**Example 2: Sports Event**
```
Field 1:
- Name: "T-Shirt Size"
- Type: Dropdown
- Options: "S, M, L, XL, XXL"
- Required: Yes

Field 2:
- Name: "Emergency Contact Number"
- Type: Phone
- Placeholder: "+91XXXXXXXXXX"
- Required: Yes

Field 3:
- Name: "Medical Conditions"
- Type: Text
- Placeholder: "Any allergies or medical conditions we should know"
- Required: No
```

## Database Schema Changes

### Event Model Updates

```javascript
{
  // Mandatory Fields
  name: String (required),
  description: String (required),
  organizer: ObjectId (required),
  type: 'Normal' | 'Merchandise' | 'Team' (required),
  eligibility: String (required),
  registrationDeadline: Date (required),
  registrationLimit: Number (required),
  registrationFee: Number (required, default: 0),
  venue: String (required),
  
  // Flexible Event Sessions
  eventSessions: [{
    sessionName: String,
    startDate: Date (required),
    endDate: Date (required),
    venue: String
  }],
  
  // Custom Fields
  customFields: [{
    fieldName: String (required),
    fieldType: 'Text' | 'Number' | 'Date' | 'Email' | 'Phone' | 'Dropdown' | 'Checkbox',
    isRequired: Boolean (default: false),
    options: [String], // For dropdown
    placeholder: String
  }],
  
  // Backwards Compatibility
  startDate: Date, // Auto-set from first session
  endDate: Date,   // Auto-set from last session
  
  // ... other fields (team details, participants, etc.)
}
```

## User Interface

### Create Event Form Layout

```
┌─────────────────────────────────────────┐
│   🆕 Create New Event                   │
├─────────────────────────────────────────┤
│                                         │
│  [Event Name]           [Event Type]   │
│  [Event Description - full width]      │
│                                         │
│  [Team Fields - if Team type selected] │
│                                         │
│  [Eligibility]          [Reg Limit]    │
│  [Registration Fee]     [Venue]        │
│  [Tags (optional)]                     │
│  [Registration Deadline]               │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 📅 Event Sessions      [+ Add]    │ │
│  ├───────────────────────────────────┤ │
│  │  Session 1          [🗑️ Remove]   │ │
│  │  [Session Name]  [Venue]          │ │
│  │  [Start Date] [Time] [End] [Time] │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ➕ Custom Fields       [+ Add]    │ │
│  ├───────────────────────────────────┤ │
│  │  Field 1            [🗑️ Remove]   │ │
│  │  [Field Name]       [Field Type]  │ │
│  │  [Placeholder]      [✓ Required]  │ │
│  │  [Options - if dropdown]          │ │
│  └───────────────────────────────────┘ │
│                                         │
│         [🚀 Publish Event]             │
└─────────────────────────────────────────┘
```

## API Changes

### Create Event Endpoint
```http
POST /api/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Web Development Workshop",
  "description": "Learn React and Node.js",
  "type": "Normal",
  "eligibility": "All Students",
  "registrationLimit": 50,
  "registrationFee": 500,
  "venue": "Computer Lab",
  "registrationDeadline": "2024-03-10T23:59:00",
  "tags": ["workshop", "web-dev"],
  
  "eventSessions": [
    {
      "sessionName": "Day 1 - React Basics",
      "startDate": "2024-03-15T14:00:00",
      "endDate": "2024-03-15T17:00:00",
      "venue": "Room 301"
    },
    {
      "sessionName": "Day 2 - Node.js Backend",
      "startDate": "2024-03-16T14:00:00",
      "endDate": "2024-03-16T17:00:00",
      "venue": "Room 301"
    }
  ],
  
  "customFields": [
    {
      "fieldName": "Programming Experience",
      "fieldType": "Dropdown",
      "isRequired": true,
      "options": ["Beginner", "Intermediate", "Advanced"]
    },
    {
      "fieldName": "Laptop Available",
      "fieldType": "Checkbox",
      "isRequired": true
    }
  ]
}
```

## Benefits

### For Organizers
1. **Flexibility**: Create events with complex schedules
2. **Custom Data Collection**: Get exactly the information you need
3. **No Technical Knowledge Required**: Simple UI to add/remove sessions and fields
4. **Single Event, Multiple Sessions**: Don't create separate events for each day
5. **Venue Management**: Different venues for different sessions

### For Participants
1. **Clear Schedule**: See all sessions at once
2. **Relevant Questions**: Only answer questions organizer needs
3. **Better Experience**: Forms are tailored to the event type

## Validation Rules

### Session Validation
- ✅ At least one session required
- ✅ Each session must have start date and end date
- ✅ End date should be after start date
- ⚠️ Times are optional (defaults used if not provided)

### Custom Field Validation
- ✅ Field name required if field is added
- ✅ Dropdown must have at least one option
- ⚠️ Empty custom fields are filtered out before saving

### Team Event Validation
- ✅ Min team size required
- ✅ Max team size required
- ✅ Max must be >= Min
- ✅ Both must be positive numbers

## Migration Notes

### Backwards Compatibility
- Old events with `startDate` and `endDate` still work
- System auto-generates `eventSessions` from old date fields if not provided
- All existing event listings continue to function
- API maintains compatibility with old event structure

### Recommended Migration
For existing events in database, organizers can:
1. Edit event (future feature)
2. Convert single date to event session
3. Add additional sessions if needed
4. Add custom fields for better data collection

## Future Enhancements

1. **Session-wise Registration**: Allow participants to register for specific sessions
2. **Session Capacity**: Different limits for different sessions
3. **Field Visibility**: Conditional fields (show field X only if field Y = value)
4. **Field Groups**: Group related fields together
5. **Pre-filled Options**: Common field templates (T-shirt sizes, experience levels, etc.)
6. **Field Validation**: Regex patterns for custom validation
7. **File Upload Fields**: Allow participants to upload documents/images
8. **Multi-select Dropdowns**: Select multiple options
9. **Date Range Fields**: Start and end date selection
10. **Dependent Sessions**: Mark sessions as prerequisites for others

## Summary

The flexible event creation system maintains all mandatory fields for data consistency while giving organizers complete freedom to:
- Structure events across multiple days and times
- Collect custom information relevant to their specific event
- Create complex event schedules without creating multiple separate events

This makes the platform suitable for simple one-time events as well as complex multi-day conferences, workshops, tournaments, and more.
