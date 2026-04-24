# 🎉 Felicity Event Management System

A full-stack web application that streamlines event management for colleges and clubs — from creation and registration to attendance tracking and team collaboration.

---

## 🚀 Live Deployment

| Service    | URL                                                             |
|------------|-----------------------------------------------------------------|
| 🌐 Frontend | https://felicity-event-management-snowy.vercel.app             |
| 🔧 Backend  | https://felicity-event-management-snowy.onrender.com           |
| ❤️ Health   | https://felicity-event-management-snowy.onrender.com/health    |

> **Note:** The backend is on Render's free tier — it may take ~15 seconds to wake up if it hasn't been used recently.

---

## 🏗️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React.js                            |
| Backend    | Node.js + Express.js                |
| Database   | MongoDB Atlas (Mongoose ODM)        |
| Auth       | JWT-based authentication            |
| Hosting    | Vercel (frontend) + Render (backend)|
| Storage    | Local file uploads (via Multer)     |

---

## 👥 User Roles

The system has **three distinct roles**, each with its own dashboard and capabilities:

### 👨‍💼 Admin
Central authority of the platform. The admin manages the entire system and oversees all users and clubs.

### 🎭 Organizer (Club)
Clubs or event organizers who create and manage events for participants to register.

### 🎓 Participant
Students or individuals who browse events, register, and attend them.

---

## ✨ Features

### 🔐 Authentication & Security
- **Role-based login** — separate login flows for Admin, Organizer, and Participant
- **JWT authentication** — secure, stateless sessions with protected routes
- **CAPTCHA verification** — reCAPTCHA integration on the login page to block bots
- **IP blocking** — security layer that can block suspicious IPs
- **Password reset system** — participants and organizers can request a password reset; admin approves and generates a new password

### 🧑‍🎓 Participant Features
- **Onboarding flow** — new participants set their interests and participant type (IIIT / Non-IIIT) on first login
- **Event discovery** — browse all published events with search and filter capabilities
- **"For You" tab** — personalized event recommendations based on selected interests and followed clubs
- **Follow clubs** — follow organizer clubs and get relevant event suggestions
- **Event registration** — register for free or paid events with custom eligibility checks (IIIT / Non-IIIT / both)
- **QR ticket generation** — upon registration, a unique QR-coded ticket is issued and stored in the participant's profile
- **Ticket history** — view all registered events and their ticket details
- **Unregistration** — cancel registration for free events before the deadline
- **Notifications** — receive in-app notifications for forum announcements

### 🎭 Organizer Features
- **Event creation** — create events with rich details: name, description, venue, sessions, eligibility, fee, tags, and category
- **Multi-session support** — events can span multiple days/sessions, each with its own date, time, and venue
- **Three event types:**
  - **Normal** — standard individual registration
  - **Merchandise** — item sales with size/color variants, stock management, and purchase limits per user
  - **Team** — team-based events with invite codes and multi-member registration
- **Custom registration forms** — organizers can build dynamic registration forms with various field types (Text, Number, Date, Email, Phone, Dropdown, Checkbox, Textarea, File Upload) with drag-and-drop reordering
- **Event lifecycle management** — control event status: Draft → Published → Ongoing → Closed
- **Registration management** — view all registrations and form responses submitted by participants
- **QR code scanning & attendance** — mark attendance by scanning participant QR codes using:
  - 📷 Live camera scan
  - 📁 File/image upload scan
  - ✏️ Manual name/ticket entry with optional override reason
- **Attendance reports** — real-time view of who has attended, with timestamps and scan methods
- **Discussion forum** — each event has a forum for organizer–participant communication
- **Forum announcements** — special announcement posts trigger Discord webhook notifications and in-app participant notifications

### 👨‍💼 Admin Features
- **Club management** — create and manage organizer (club) accounts
- **Participant oversight** — view all registered participants
- **Password reset approvals** — review, approve, or reject password reset requests from users; generates a temporary password when approved
- **Platform-wide visibility** — access to all clubs, events, and users across the system

### 🤝 Team Event System
- **Team creation** — team leader creates a team, specifies size (min/max), and invites members by email
- **Invite codes** — each team gets a unique invite code; invited members receive an email with a join link
- **Join flow** — members join via link `/join-team/:inviteCode` and accept/decline the invitation
- **Team management** — view team status (Pending / Complete / Cancelled), member acceptance status, and team details
- **POC unregistration** — the team leader (POC) can unregister the entire team, removing all members from the event

### 💬 Discussion Forum
- **Per-event forums** — every event has its own discussion thread
- **Organizer-only posting** — only the event organizer can post in the forum
- **Announcement flag** — posts marked as announcements are highlighted and trigger:
  - Discord webhook notification to a configured channel
  - In-app notification to all registered participants

### 🛡️ Security Monitoring
- **Security event logging** — tracks suspicious activities and login anomalies
- **Blocked IP management** — admin can view and manage blocked IPs

---

## 📁 Project Structure

```
felicity-event-management/
├── backend/               # Node.js + Express API
│   ├── controllers/       # Core business logic
│   ├── middleware/        # Auth, CAPTCHA verification
│   ├── models/            # Mongoose schemas (User, Event, Forum, etc.)
│   ├── routes/            # API route definitions
│   └── uploads/           # Uploaded files (form attachments)
├── frontend/              # React application
│   ├── src/
│   │   ├── pages/         # Dashboard pages (Admin, Organizer, Participant, etc.)
│   │   ├── context/       # AuthContext for global auth state
│   │   └── ...
│   └── .env               # Frontend environment variables
├── README.md
└── deployment.txt         # Live URLs and deployment notes
```

---

## ⚙️ Environment Variables

### Frontend (Vercel)
```
REACT_APP_API_URL=https://felicity-event-management-snowy.onrender.com
```

### Backend (Render)
```
MONGO_URI=<MongoDB Atlas Connection String>
JWT_SECRET=<your_jwt_secret>
FRONTEND_URL=https://felicity-event-management-snowy.vercel.app
DISCORD_WEBHOOK_URL=<optional discord webhook for forum announcements>
RECAPTCHA_SECRET_KEY=<Google reCAPTCHA secret>
```

---

## 🔑 Default Admin Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | admin@felicity.com |
| Password | admin123           |

> ⚠️ Change these credentials immediately after first login in a production environment.

---

## 🏃 Running Locally

### Backend
```bash
cd backend
npm install
npm start         # or: node server.js
```

### Frontend
```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:5000` by default.
