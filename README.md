# Felicity Event Management System

A comprehensive full-stack web application designed to facilitate event management for academic institutions and student organizations. The system encompasses the entire event lifecycle, including event creation, participant registration, attendance tracking, and team collaboration.

---

## Live Deployment

| Service  | URL                                                          |
|----------|--------------------------------------------------------------|
| Frontend | https://felicity-event-management-snowy.vercel.app           |
| Backend  | https://felicity-event-management-snowy.onrender.com         |
| Health   | https://felicity-event-management-snowy.onrender.com/health  |

> **Note:** The backend service is currently hosted on a complimentary tier and may experience a brief initialization delay (approximately 15 seconds) after periods of inactivity.

---

## Technology Stack

| Architecture Layer | Technology                          |
|--------------------|-------------------------------------|
| Frontend           | React.js                            |
| Backend            | Node.js, Express.js                 |
| Database           | MongoDB Atlas, Mongoose ODM         |
| Authentication     | JWT-based authentication            |
| Hosting Infrastructure | Vercel (Frontend), Render (Backend) |
| Storage            | Local file uploads via Multer       |

---

## User Roles

The platform incorporates three distinct user roles, each provisioned with a dedicated interface and specific administrative capabilities:

### Administrator
The central authority of the platform. Administrators possess comprehensive oversight of the entire system, managing all registered users and organizational entities (clubs).

### Organizer
Representatives of clubs or specific event organizers. Organizers are authorized to create, configure, and manage events for participant registration.

### Participant
Students or general individuals who utilize the platform to discover events, complete registrations, and attend scheduled activities.

---

## Key Features

### Authentication & General Security
- **Role-Based Access Control:** Distinct authentication workflows for Administrators, Organizers, and Participants.
- **JWT Authentication:** Secure, stateless session management protecting restricted endpoints.
- **CAPTCHA Verification:** Integration of reCAPTCHA on the authentication portal to mitigate automated bots.
- **IP Blocking Mechanism:** An active security layer capable of restricting access from suspicious IP addresses.
- **Password Reset Protocol:** Participants and Organizers may request a password reset; Administrators review these requests and issue temporary credentials upon approval.

### Participant Functionality
- **Onboarding Process:** New participants define their interests and demographic classification (e.g., specific student group vs. external participant) upon initial login.
- **Event Discovery:** Browse available events Utilizing search and filtering parameters.
- **Personalized Recommendations:** A dedicated interface providing event suggestions aligned with stated interests and followed organizations.
- **Organization Following:** Participants can subscribe to specific clubs to receive relevant updates and event notifications.
- **Registration Management:** Functionality to register for both complimentary and paid events, subject to predefined eligibility criteria.
- **QR Code Ticketing:** Secure, unique QR-coded tickets are generated and stored in the participant's profile post-registration.
- **Ticketing History:** A comprehensive log of all registered events and associated ticket information.
- **Registration Cancellation:** Participants may withdraw their registration for complimentary events prior to the stipulated deadline.
- **Integrated Notifications:** In-application alerts regarding forum announcements and essential updates.

### Organizer Functionality
- **Event Configuration:** Create comprehensive event listings detailing nomenclature, description, venue, sub-sessions, eligibility requirements, entry fees, categorizations, and descriptive tags.
- **Multi-Session Management:** Support for multi-day operations wherein individual sessions hold distinct scheduling and venue allocations.
- **Event Classifications:**
  - **Standard Registration:** Individual participation events.
  - **Merchandise Distribution:** Management of item sales, size/variant tracking, inventory control, and purchase limitations.
  - **Team Competition:** Group-based events supporting invitation codes and multi-member coordination.
- **Dynamic Registration Forms:** Organizers can engineer customized registration forms leveraging diverse input types (Text, Numeric, Date, Email, Telephone, Selection Menus, Binary Choices, Extended Text, and File Uploads) supported by a graphical interface for structural organization.
- **Lifecycle Management:** Administrative control over the event state (e.g., Draft, Published, Active, Concluded).
- **Registration Oversight:** Review participant registrations and submitted primary form data.
- **Attendance Processing:** Validate attendance via QR code verification utilizing:
  - Live camera scanning
  - File/image artifact analysis
  - Manual entry override capabilities requiring documented justification
- **Attendance Analytics:** Real-time visibility of participant attendance, including timestamps and verification methodology.
- **Discussion Modules:** Dedicated communication channels for organizer-to-participant correspondence.
- **Announcement Broadcasting:** High-priority forum postings automatically trigger Discord webhook integrations and alert all registered participants.

### Administrator Functionality
- **Entity Management:** Provision and regulate organizer (club) accounts.
- **Participant Oversight:** Audit all registered participants within the platform.
- **Credential Recovery Administration:** Approve or decline user password reset requests and issue temporary passwords correspondingly.
- **Global Visibility:** Unrestricted access across all operational data, comprising clubs, events, and user accounts.

### Collaborative Team System
- **Team Initialization:** Designated leaders initialize teams, defining capacity parameters and dispatching email invitations.
- **Invitation Protocol:** Unique cryptographic access codes are generated for each team; invited personnel receive automated joining instructions.
- **Integration Workflow:** Members join executing unique URLs and definitively accept or decline respective invitations.
- **Team Supervision:** Monitor operational status (Pending, Complete, Cancelled) and individual member resolutions.
- **Group Unregistration:** Team leaders retain the authority to withdraw the entire team, terminating the registration for all associated members.

### Discussion and Communication Forum
- **Dedicated Event Forums:** Exclusive discussion threads allocated per event.
- **Restricted Publishing:** Only accredited event organizers retain publishing privileges within the forum.
- **Announcement Protocols:** Priority posts trigger elevated notifications including:
  - Discord webhook dispatch to preconfigured operational channels.
  - In-application alerts distributed to all registered clientele.

### Security and Auditing
- **Security Event Logging:** Systematic tracking of suspicious activities and irregular authentication attempts.
- **Access Control Administration:** Interface for administrators to monitor and govern blocked IP addresses.

---

## Project Structure

```text
felicity-event-management/
├── backend/               # Node.js + Express API
│   ├── controllers/       # Core business logic
│   ├── middleware/        # Authentication, CAPTCHA verification
│   ├── models/            # Mongoose schemas (User, Event, Forum, etc.)
│   ├── routes/            # API route definitions
│   └── uploads/           # Uploaded files (form attachments)
├── frontend/              # React application
│   ├── src/
│   │   ├── pages/         # Dashboard interfaces
│   │   ├── context/       # Global authentication state management
│   │   └── ...
│   └── .env               # Frontend environment configurations
├── README.md
└── deployment.txt         # Live URLs and deployment reference documentation
```

---

## Environment Variables

### Frontend Application (Vercel)
```env
REACT_APP_API_URL=https://felicity-event-management-snowy.onrender.com
```

### Backend Application (Render)
```env
MONGO_URI=<MongoDB Atlas Connection String>
JWT_SECRET=<JWT Secret Key>
FRONTEND_URL=https://felicity-event-management-snowy.vercel.app
DISCORD_WEBHOOK_URL=<Discord Webhook URL for Announcements>
RECAPTCHA_SECRET_KEY=<Google reCAPTCHA Secret Key>
```

---

## Default Administrative Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | admin@felicity.com |
| Password | admin123           |

> **Important:** Modify these credentials immediately following initial deployment in any production environment.

---

## Local Development Instructions

### Backend Initialization
```bash
cd backend
npm install
npm start         # Alternatively: node server.js
```

### Frontend Initialization
```bash
cd frontend
npm install
npm start
```

By default, the frontend application serves on `http://localhost:3000` while the backend service listens on `http://localhost:5000`.
