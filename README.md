# 🛡️ SafeRoute
### Tri-Party Student Safety System — Complete Documentation

SafeRoute is a full-stack safety platform that tracks a student's daily journey between home and school using three-party fingerprint verification, automated alert escalation, emergency panic mode, and a shared journey chat. It is designed for the Nigerian context — built around Africa's Talking for SMS/call fallback, Paystack-ready for future monetisation, and optimised for low-bandwidth mobile networks.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [How It Works](#2-how-it-works)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Tech Stack](#5-tech-stack)
6. [Environment Variables](#6-environment-variables)
7. [Installation & Local Setup](#7-installation--local-setup)
8. [API Endpoints](#8-api-endpoints)
9. [Alert Escalation Logic](#9-alert-escalation-logic)
10. [Emergency System](#10-emergency-system)
11. [Journey Chat](#11-journey-chat)
12. [Mobile App — Roles & Screens](#12-mobile-app--roles--screens)
13. [Biometric Simulation](#13-biometric-simulation)
14. [Firestore Data Models](#14-firestore-data-models)
15. [Firestore Security Rules](#15-firestore-security-rules)
16. [Deployment — Production](#16-deployment--production)
17. [Hardware Phase — What Changes](#17-hardware-phase--what-changes)
18. [Testing Checklist](#18-testing-checklist)
19. [Known Limitations & Roadmap](#19-known-limitations--roadmap)

---

## 1. System Overview

SafeRoute solves one problem: a parent sends their child to school and has no reliable way to know if the child arrived safely, left school safely, or made it home. Existing solutions are either WhatsApp groups (informal, no accountability) or expensive proprietary hardware.

SafeRoute creates a **verified safety chain** with four checkpoints per school day:

| # | Checkpoint | Who Confirms |
|---|-----------|--------------|
| 1 | Left Home | Parent (fingerprint) |
| 2 | Arrived at School | Student (fingerprint) |
| 3 | Left School | Teacher + Student (both fingerprints required) |
| 4 | Arrived Home | Parent (fingerprint) |

If any checkpoint is missed within a configurable time window, the system automatically escalates — first a push notification, then SMS and a phone call, then the security organisation is contacted directly.

---

## 2. How It Works

### The Three Phones (Simulation Phase)

During the simulation phase, three mobile phones replace the hardware fingerprint scanners:

- **Phone 1 — Parent**: Confirms checkpoints 1 and 4 (home departure and home arrival)
- **Phone 2 — Student**: Confirms checkpoint 2 (school arrival) and half of checkpoint 3 (school departure)
- **Phone 3 — Teacher**: Confirms the other half of checkpoint 3 (school departure)

Each confirmation requires a **fingerprint scan** on the device. On devices without fingerprint hardware enrolled, the app falls back to a tap-to-confirm dialog for simulation purposes.

### A Normal School Day

```
07:00  Parent scans fingerprint → HOME_DEPARTURE confirmed
       ↓ Journey created in Firestore
       ↓ Chat thread opened: "Amara left home at 07:00"

07:45  Student scans fingerprint at school gate → SCHOOL_ARRIVAL confirmed
       ↓ All parties notified via push
       ↓ Chat: "Amara arrived at school at 07:45"

14:30  Teacher scans → waiting for student
14:31  Student scans → SCHOOL_DEPARTURE fully confirmed (both required)
       ↓ Chat: "Amara left school at 14:31"

15:20  Parent scans fingerprint → HOME_ARRIVAL confirmed
       ↓ Journey marked COMPLETED
       ↓ Chat: "Amara arrived home safely at 15:20 ✅"
```

### A Day Something Goes Wrong

```
07:00  Parent confirms HOME_DEPARTURE
08:45  (60 min window expires — no SCHOOL_ARRIVAL)

       → Level 1: Push notification to parent + school admin
         "Amara has not arrived at school. Please check in."

09:00  (15 min later — no response)

       → Level 2: SMS + voice call to parent's phone
         "SAFEROUTE ALERT: Amara has not confirmed school arrival..."

09:30  (30 min after Level 1 — still no response)

       → Level 3: Security organisation contacted via SMS + call
         "SAFEROUTE SECURITY ALERT: Amara from Greenfield Academy..."
```

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   THREE PHONES                       │
│  Phone 1 (Parent) │ Phone 2 (Student) │ Phone 3 (Teacher) │
│        └──────────────────┬───────────────┘         │
│                    Expo React Native                 │
│              expo-local-authentication               │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (Bearer token)
┌──────────────────────▼──────────────────────────────┐
│              BACKEND — Node.js + Express             │
│                   Port 3000                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Journey    │  │    Alert     │  │ Emergency  │  │
│  │  Service    │  │   Service    │  │ Controller │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │
│         └────────────────┼────────────────┘         │
│                    ┌─────▼──────┐                    │
│                    │  Firebase  │                    │
│                    │   Admin    │                    │
│                    └─────┬──────┘                    │
└──────────────────────────┼──────────────────────────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Firestore       FCM Push    Africa's Talking
       (Database)   (Notifications)  (SMS + Calls)
```

---

## 4. Project Structure

```
saferoute/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── userController.js       User registration, profile, FCM token
│   │   │   ├── journeyController.js    Journey creation, checkpoint confirmation
│   │   │   ├── emergencyController.js  Panic trigger, resolution
│   │   │   └── chatController.js       Journey chat messages
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js                 Firebase token verification + role guard
│   │   │
│   │   ├── routes/
│   │   │   └── index.js                All 15 API routes in one file
│   │   │
│   │   ├── services/
│   │   │   ├── journeyService.js       Core journey + checkpoint logic
│   │   │   ├── alertService.js         Escalation engine (L1 → L2 → L3)
│   │   │   └── notificationService.js  FCM push + Africa's Talking SMS/call
│   │   │
│   │   ├── utils/
│   │   │   ├── firebase.js             Firebase Admin SDK initialiser
│   │   │   └── constants.js            Checkpoints, roles, status enums
│   │   │
│   │   └── server.js                   Express app + cron job entry point
│   │
│   ├── firestore.rules                 Firestore security rules
│   ├── .env                            Credentials (never commit)
│   ├── .env.example                    Template
│   └── package.json
│
└── mobile/
    ├── App.js                          Entry point
    └── src/
        ├── screens/
        │   ├── auth/
        │   │   ├── LoginScreen.js
        │   │   └── RegisterScreen.js
        │   ├── parent/
        │   │   └── ParentDashboard.js  Phone 1 view
        │   ├── teacher/
        │   │   └── TeacherDashboard.js Phone 3 view
        │   ├── admin/
        │   │   └── AdminDashboard.js   School management view
        │   └── ChatScreen.js           Shared journey chat
        │
        ├── components/
        │   ├── CheckpointButton.js     Fingerprint CTA (used on all phones)
        │   ├── JourneyTimeline.js      4-step progress strip
        │   └── EmergencyButton.js      Red panic button
        │
        ├── hooks/
        │   ├── useAuth.js              Firebase auth context
        │   └── useBiometric.js         expo-local-authentication wrapper
        │
        ├── navigation/
        │   └── RootNavigator.js        Role-based routing
        │
        ├── services/
        │   ├── firebase.js             Firebase client config
        │   └── api.js                  Axios wrapper with token injection
        │
        └── constants/
            └── index.js                Colors, labels, roles, API URL
```

---

## 5. Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | REST API server |
| Firebase Admin SDK | Firestore writes, Auth token verification, FCM push |
| Firebase Firestore | Primary database — journeys, users, chat, emergencies |
| Firebase Cloud Messaging | Push notifications to all app users |
| Africa's Talking | SMS and voice call escalation (Nigerian numbers) |
| node-cron | Scheduled job that checks for missed checkpoints every minute |
| helmet + cors | Security headers and cross-origin requests |

### Mobile
| Technology | Purpose |
|-----------|---------|
| Expo (React Native) | Cross-platform iOS + Android from one codebase |
| expo-local-authentication | Device fingerprint / Face ID verification |
| expo-notifications | Receiving FCM push notifications |
| Firebase JS SDK | Auth (sign in/out) + Firestore real-time reads |
| Axios | HTTP client for backend API calls |
| React Navigation | Stack + tab navigation |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Railway / Render | Backend hosting (Node.js) |
| Firebase (Google Cloud) | Database, Auth, Push |
| Africa's Talking | Nigerian SMS and voice |
| Vercel (optional) | Admin web dashboard |

---

## 6. Environment Variables

All variables live in `backend/.env`. Never commit this file.

```bash
# Server
PORT=3000
NODE_ENV=development         # change to "production" on server

# Firebase Admin SDK (from Service Account JSON)
FIREBASE_PROJECT_ID=saferoute-dded8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@saferoute-dded8.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://saferoute-dded8.firebaseio.com

# Africa's Talking
AT_API_KEY=your-api-key
AT_USERNAME=your-username
AT_SENDER_ID=SafeRoute

# Alert timing windows (minutes)
WINDOW_HOME_TO_SCHOOL=60     # alert if school not reached within 60 min
WINDOW_SCHOOL_TO_HOME=90     # alert if home not reached within 90 min of school departure
ALERT_ESCALATION_MINUTES=15  # wait 15 min after L1 before L2
SECURITY_ESCALATION_MINUTES=30  # wait 30 min after L1 before L3

# Security organisation
SECURITY_ORG_PHONE=+2348000000000
SECURITY_ORG_EMAIL=security@example.com

# Hardware phase (future)
DEVICE_SECRET=replace-with-strong-random-secret
```

---

## 7. Installation & Local Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Expo Go app on your phone
- Firebase project (see Firebase Setup section)

### Backend

```bash
git clone https://github.com/yourname/saferoute.git
cd saferoute/backend

cp .env.example .env
# Fill in your Firebase and Africa's Talking credentials

npm install
npm run dev
```

Server starts on `http://localhost:3000`

Verify with:
```bash
curl http://localhost:3000/api/v1/health
# → {"status":"ok","timestamp":"..."}
```

### Mobile

```bash
cd saferoute/mobile

# Set your machine's local IP in src/constants/index.js
# API_BASE_URL = 'http://YOUR_LOCAL_IP:3000/api/v1'

# Fill in your Firebase web config in src/services/firebase.js

npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. All three simulation phones must be on the same WiFi network as the development machine.

---

## 8. API Endpoints

All endpoints are prefixed with `/api/v1`. All except `/health` require a Firebase ID token in the `Authorization: Bearer <token>` header.

### Health
```
GET /health
Response: { status: "ok", timestamp: "..." }
```

---

### Users

#### Register a new user
```
POST /users/register
Auth: Required

Body:
{
  "name": "Funmi Adeyemi",
  "phone": "+2348012345678",
  "role": "parent",              // parent | student | teacher | admin | security
  "schoolId": "school_abc123",
  "parentId": "uid_parent123",   // required if role = student
  "teacherId": "uid_teacher456"  // required if role = student
}

Response 201:
{
  "message": "User registered",
  "uid": "firebase_uid",
  "role": "parent"
}
```

#### Update FCM push token
```
PUT /users/fcm-token
Auth: Required

Body: { "fcmToken": "ExponentPushToken[...]" }
Response: { "message": "FCM token updated" }
```

#### Get own profile
```
GET /users/me
Auth: Required

Response:
{
  "uid": "...",
  "name": "Funmi Adeyemi",
  "phone": "+2348012345678",
  "role": "parent",
  "schoolId": "school_abc123",
  "fcmToken": "..."
}
```

#### Get children (parent only)
```
GET /users/children
Auth: Required (role: parent)

Response: [ { student profile }, ... ]
```

#### Get students for a school
```
GET /users/school/:schoolId/students
Auth: Required (role: admin | teacher)

Response: [ { student profile }, ... ]
```

---

### Journeys

#### Start or get today's journey
```
POST /journeys/start
Auth: Required

Body: { "studentId": "uid_student123" }

Response 200:
{
  "id": "journey_abc",
  "studentId": "uid_student123",
  "studentName": "Amara Okafor",
  "parentId": "uid_parent456",
  "schoolId": "school_xyz",
  "date": "2026-06-12",
  "status": "NOT_STARTED",
  "alertStatus": "NONE",
  "checkpoints": {}
}
```

#### Confirm a checkpoint
```
POST /journeys/:journeyId/checkpoint
Auth: Required

Body:
{
  "checkpoint": "HOME_DEPARTURE",  // HOME_DEPARTURE | SCHOOL_ARRIVAL | SCHOOL_DEPARTURE | HOME_ARRIVAL
  "biometricVerified": true        // must be true — verified by expo-local-authentication
}

Response:
{
  "journeyId": "journey_abc",
  "checkpoint": "HOME_DEPARTURE",
  "allConfirmed": true,
  "status": "IN_PROGRESS"
}

Errors:
400 - "Biometric verification required"
400 - "Role 'parent' cannot confirm checkpoint 'SCHOOL_ARRIVAL'"
400 - "Already confirmed by teacher"
404 - "Journey not found"
```

#### Get today's journey for a student
```
GET /journeys/student/:studentId
Auth: Required

Response: Journey object (same as /start)
404 if no journey exists today
```

#### Get all journeys for a school today
```
GET /journeys/school/:schoolId
Auth: Required (role: admin | teacher)

Response: [ journey, journey, ... ]
```

---

### Chat

#### Get all messages in a journey chat
```
GET /journeys/:journeyId/chat
Auth: Required

Response:
[
  {
    "id": "msg_abc",
    "type": "system",
    "text": "✅ Amara — home departure confirmed at 07:00",
    "authorId": "system",
    "authorName": "SafeRoute",
    "timestamp": "..."
  },
  {
    "id": "msg_def",
    "type": "user",
    "text": "She left a bit late, traffic on the road",
    "authorId": "uid_parent456",
    "authorName": "Funmi Adeyemi",
    "authorRole": "parent",
    "timestamp": "..."
  }
]
```

#### Post a message
```
POST /journeys/:journeyId/chat
Auth: Required (must be linked to the journey or school admin)

Body: { "text": "She left a bit late, traffic on the road" }

Response 201: Message object
403 if user is not linked to the journey
```

---

### Emergency

#### Trigger emergency alert
```
POST /emergency/trigger
Auth: Required (any role)

Body:
{
  "schoolId": "school_xyz",
  "journeyId": "journey_abc",   // optional — links alert to a specific journey
  "reason": "Armed men at gate"
}

Response 200:
{
  "message": "Emergency alert sent to all parties",
  "emergencyId": "emg_xyz123"
}

What happens immediately:
- Push notification to every user in the school
- SMS + voice call to security organisation
- Journey status updated to EMERGENCY
- System message posted to journey chat
```

#### Resolve an emergency
```
POST /emergency/:emergencyId/resolve
Auth: Required (role: admin | security)

Body: { "notes": "Police arrived, situation under control" }

Response:
{
  "message": "Emergency resolved",
  "emergencyId": "emg_xyz123"
}
```

#### Get active emergencies for a school
```
GET /emergency/school/:schoolId/active
Auth: Required

Response: [ emergency objects where resolved = false ]
```

---

## 9. Alert Escalation Logic

The cron job runs every minute between 06:00 and 22:00 WAT. It checks all journeys with status `IN_PROGRESS` or `ALERT_ACTIVE` for the current day.

### Escalation Flow

```
HOME_DEPARTURE confirmed
        │
        │  WINDOW_HOME_TO_SCHOOL (default: 60 min)
        ▼
SCHOOL_ARRIVAL missing?
        │
        ├── elapsed > window → Level 1
        │     Push to parent + school admins
        │     Journey status → ALERT_ACTIVE
        │     System message posted to chat
        │
        ├── elapsed > window + 15 min AND still at Level 1 → Level 2
        │     SMS to parent
        │     Voice call to parent
        │
        └── elapsed > window + 30 min AND not yet Level 3 → Level 3
              SMS to security organisation
              Voice call to security organisation
              Journey status stays ALERT_ACTIVE
```

Same logic repeats for:
```
SCHOOL_DEPARTURE confirmed
        │
        │  WINDOW_SCHOOL_TO_HOME (default: 90 min)
        ▼
HOME_ARRIVAL missing? → same three-level escalation
```

### Alert Status Values

| Value | Meaning |
|-------|---------|
| `NONE` | No alert — journey on track |
| `LEVEL_1` | Push notification sent |
| `LEVEL_2` | SMS + call sent to parent |
| `LEVEL_3` | Security organisation contacted |

### Resetting an Alert

An alert is automatically cleared (set back to `NONE`) when the missing checkpoint is eventually confirmed. The journey continues normally.

---

## 10. Emergency System

The emergency system is completely separate from the checkpoint alert system. It is for immediate physical threats (school attack, abduction in progress, etc.).

### How It Works

1. Any authenticated user taps the **EMERGENCY** button in the app
2. A confirmation dialog appears — two taps required to prevent accidental triggers
3. On confirmation:
   - Push notification sent to **every user** in the school simultaneously
   - SMS + voice call fired to the security organisation **immediately** (no timer)
   - Journey (if provided) updated to `EMERGENCY` status
   - System message posted to journey chat

### Who Can Trigger
- Parent ✅
- Teacher ✅
- Admin ✅
- Security ✅
- Student ✅ (via the app)

### Who Can Resolve
- Admin only
- Security only

### Physical Panic Button (Hardware Phase)
In production, a physical button wired to the ESP32 at the school gate triggers the same `POST /emergency/trigger` endpoint — bypassing the app entirely. This means the emergency system works even if the internet is down at the school (the ESP32 stores the request and retries).

---

## 11. Journey Chat

Every journey has a dedicated chat thread that opens automatically when the first checkpoint is confirmed. It serves as an audit trail and a communication channel for all three parties.

### Who Can Post
- Parent linked to the student
- Teacher linked to the student
- School admin (for any student in their school)

### Message Types

| Type | Posted By | Example |
|------|-----------|---------|
| `system` | SafeRoute (automatic) | "✅ Amara — arrived at school at 07:45" |
| `alert` | SafeRoute (automatic) | "🔔 Alert Level 1: Amara has not arrived at school" |
| `emergency` | SafeRoute (automatic) | "🚨 EMERGENCY TRIGGERED by teacher" |
| `user` | Parent / Teacher / Admin | "She mentioned she had a doctor's appointment" |

### Purpose in Practice
The chat is where parents explain late departures, teachers flag unusual situations, and admins communicate during alerts — all with a timestamped, permanent record attached to that specific journey.

---

## 12. Mobile App — Roles & Screens

### Parent (Phone 1)
- **Dashboard**: See all linked children, their journey timelines, and alert status
- **Confirm Left Home**: Fingerprint → HOME_DEPARTURE
- **Confirm Arrived Home**: Fingerprint → HOME_ARRIVAL (only enabled after SCHOOL_DEPARTURE is confirmed)
- **Journey Chat**: Per-child chat thread
- **Emergency Button**: Always visible at the bottom

### Teacher (Phone 3)
- **Dashboard**: List of all students in their school with journey status
- **Search**: Filter students by name
- **Confirm Dismissal**: Fingerprint → SCHOOL_DEPARTURE teacher half (only shows when student has checked in)
- **Alert View**: Students with active alerts shown at the top
- **Journey Chat**: Per-student chat
- **Emergency Button**: Always visible

### Student (Phone 2)
- **Check In**: Fingerprint → SCHOOL_ARRIVAL
- **Confirm Leaving**: Fingerprint → SCHOOL_DEPARTURE student half
- **Journey Chat**: View only (or limited posting)
- **Emergency Button**: Visible

### Admin
- **School Dashboard**: All students, all journeys, all alert statuses
- **Alert Management**: View active alerts, contact parents
- **Emergency Management**: Trigger and resolve emergencies
- **Resolve emergencies**

---

## 13. Biometric Simulation

The `useBiometric` hook in `mobile/src/hooks/useBiometric.js` handles two scenarios:

### Real Device with Fingerprint Enrolled
Uses `expo-local-authentication` which calls the device's native biometric system. On Android this is the fingerprint sensor. On iOS it is Face ID or Touch ID. The result (`success: true/false`) is what the app uses — the actual fingerprint template never leaves the device.

### Device Without Fingerprint (Simulation Fallback)
If the device has no fingerprint sensor or none is enrolled, the hook shows a dialog:

```
🔐 Simulation Mode
Fingerprint not available. Tap Confirm to simulate
biometric verification.

[Cancel]  [Confirm]
```

This means simulation testing works on any device, even emulators.

### Important Security Note
In simulation mode, the biometric check is bypassed with a tap. In production, `biometricVerified: true` must only ever be sent to the backend if `LocalAuthentication.authenticateAsync()` returned `success: true`. The backend trusts this flag — so the mobile app is the enforcement point for biometric integrity during the simulation phase. In the hardware phase, the ESP32 hardware itself becomes the enforcement point.

---

## 14. Firestore Data Models

### users collection
```javascript
{
  uid: "firebase_uid",
  name: "Amara Okafor",
  phone: "+2348012345678",
  role: "student",               // parent | student | teacher | admin | security
  schoolId: "school_xyz",
  parentId: "uid_parent456",     // students only
  teacherId: "uid_teacher789",   // students only
  fcmToken: "ExponentPushToken[...]",
  enrolledAt: Timestamp,
  updatedAt: Timestamp
}
```

### schools collection
```javascript
{
  name: "Greenfield Academy",
  address: "12 Awolowo Road, Ikoyi, Lagos",
  phone: "+2341234567",
  adminId: "uid_admin123",
  createdAt: Timestamp
}
```

### journeys collection
```javascript
{
  studentId: "uid_student123",
  studentName: "Amara Okafor",
  parentId: "uid_parent456",
  schoolId: "school_xyz",
  teacherId: "uid_teacher789",
  date: "2026-06-12",
  status: "IN_PROGRESS",         // NOT_STARTED | IN_PROGRESS | COMPLETED | ALERT_ACTIVE | EMERGENCY
  alertStatus: "NONE",           // NONE | LEVEL_1 | LEVEL_2 | LEVEL_3
  emergencyId: null,
  checkpoints: {
    HOME_DEPARTURE: {
      fullyConfirmed: true,
      timestamp: Timestamp,
      confirmations: {
        parent: {
          userId: "uid_parent456",
          timestamp: Timestamp,
          biometricVerified: true
        }
      }
    },
    SCHOOL_ARRIVAL: { ... },
    SCHOOL_DEPARTURE: {
      fullyConfirmed: true,      // only true when BOTH teacher AND student confirmed
      confirmations: {
        teacher: { ... },
        student: { ... }
      }
    },
    HOME_ARRIVAL: { ... }
  },
  alertLevel1At: Timestamp,
  alertLevel2At: Timestamp,
  alertLevel3At: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### journeys/{journeyId}/chat subcollection
```javascript
{
  type: "user",                  // user | system | alert | emergency
  text: "She left a bit late",
  authorId: "uid_parent456",
  authorName: "Funmi Adeyemi",
  authorRole: "parent",
  timestamp: Timestamp
}
```

### emergencies collection
```javascript
{
  schoolId: "school_xyz",
  journeyId: "journey_abc",
  triggeredBy: "uid_teacher789",
  triggererRole: "teacher",
  reason: "Armed men at gate",
  timestamp: Timestamp,
  resolved: false,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNotes: null
}
```

---

## 15. Firestore Security Rules

Stored in `backend/firestore.rules`. Deploy with:

```bash
firebase deploy --only firestore:rules
```

Key rules:
- Users can only read their own profile (admins and teachers can read all in their school)
- Journey reads are restricted to the parent, student, teacher linked to that journey, or the school admin
- All journey **writes** go through the backend only (Admin SDK bypasses client rules)
- Chat can be read and created by authenticated users — not updated or deleted
- Emergency reads are restricted to admins, security, and the person who triggered it

---

## 16. Deployment — Production

### Backend — Railway (Recommended for Nigeria)

1. Push your code to GitHub (without `.env`)
2. Go to [railway.app](https://railway.app) and create a new project
3. Connect your GitHub repo
4. Add all environment variables from `.env` in the Railway dashboard under **Variables**
5. Railway auto-detects Node.js and runs `npm start`
6. Copy the generated URL (e.g. `https://saferoute-backend.railway.app`)

```bash
# Update in mobile/src/constants/index.js
API_BASE_URL = 'https://saferoute-backend.railway.app/api/v1'
```

### Mobile — Expo EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

This produces an APK (Android) and IPA (iOS) that can be distributed directly or submitted to app stores.

### Firestore Indexes

Some queries require composite indexes. Firestore will throw an error with a direct link to create the index when you first run those queries. The ones you'll need:

```
Collection: journeys
Fields: studentId ASC, date ASC

Collection: journeys
Fields: schoolId ASC, date ASC, updatedAt DESC

Collection: journeys
Fields: status ASC, date ASC

Collection: emergencies
Fields: schoolId ASC, resolved ASC, timestamp DESC
```

### Production Checklist

- [ ] `NODE_ENV=production` in environment variables
- [ ] `.env` never committed to git
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Firestore indexes created
- [ ] Africa's Talking account funded with airtime credits
- [ ] FCM push tested on a real device
- [ ] HTTPS enforced (Railway does this automatically)
- [ ] `API_BASE_URL` in mobile constants points to production URL
- [ ] Expo EAS build created for Android and iOS
- [ ] Alert timing windows configured for your school's schedule

---

## 17. Hardware Phase — What Changes

When moving from the three-phone simulation to physical hardware at homes and schools, the following changes:

### What Stays the Same
- The entire backend (all endpoints, all logic)
- The mobile app for parents and teachers
- Firebase, Firestore, FCM
- All alert and emergency logic

### What Changes

**Home Unit (ESP32 + R307 fingerprint sensor)**
- Replaces Phone 1's biometric for HOME_DEPARTURE and HOME_ARRIVAL
- ESP32 reads fingerprint over UART, verifies against stored template
- On match, sends `POST /journeys/{id}/checkpoint` with `biometricVerified: true` and a device API key
- Powered by USB with Li-ion battery backup for power cuts

**School Gate Unit (Raspberry Pi or ESP32 + scanner)**
- Replaces Phone 2 for SCHOOL_ARRIVAL
- Fixed unit at the school gate
- Small OLED screen shows student name and status on successful scan
- Buzzer sounds on unrecognised fingerprint

**Classroom Unit (ESP32 per classroom)**
- Replaces Phone 3's teacher confirmation for SCHOOL_DEPARTURE
- Teacher and student both scan on the same unit
- Same HTTPS POST to backend

**Physical Panic Button**
- Wired to GPIO on the school gate ESP32
- Sends `POST /emergency/trigger` directly — works even if the teacher's phone is unavailable

**New Backend Addition for Hardware Phase**
- Device API key authentication (the `DEVICE_SECRET` env variable is already wired for this)
- Fingerprint template enrollment endpoint (`POST /enrollment/fingerprint`)
- Device registration and health monitoring

---

## 18. Testing Checklist

### Three-Phone Simulation Test

Run through this full scenario with three phones before going to production:

**Setup**
- [ ] Phone 1 logged in as a `parent` account
- [ ] Phone 2 logged in as a `student` account (linked to the parent)
- [ ] Phone 3 logged in as a `teacher` account (linked to the student)
- [ ] All three phones on same WiFi as backend

**Happy Path**
- [ ] Phone 1: Tap "Confirm Left Home" → biometric → timeline updates on all phones
- [ ] Phone 2: Tap "Check In at School" → biometric → timeline updates
- [ ] Phone 3: Tap "Confirm Dismissal" → biometric → SCHOOL_DEPARTURE shows "waiting for student"
- [ ] Phone 2: Tap student dismissal confirmation → SCHOOL_DEPARTURE fully confirmed
- [ ] Phone 1: Tap "Confirm Arrived Home" → journey shows COMPLETED ✅
- [ ] Chat shows all five system messages in order

**Alert Test**
- [ ] Complete HOME_DEPARTURE only
- [ ] In Firestore, manually set the `HOME_DEPARTURE.timestamp` to 2 hours ago
- [ ] Wait for cron to fire (up to 1 minute) or restart the server to trigger immediately
- [ ] Verify push notification arrives on Phone 1
- [ ] Verify chat shows Level 1 alert message

**Emergency Test**
- [ ] On any phone, tap EMERGENCY button
- [ ] Confirm the dialog
- [ ] Verify push notification arrives on all three phones
- [ ] Verify emergency document created in Firestore
- [ ] Verify journey status shows EMERGENCY

---

## 19. Known Limitations & Roadmap

### Current Limitations (Simulation Phase)

- **Biometric trust is client-side**: In simulation, the app sends `biometricVerified: true` after the device scan. There is no cryptographic proof from the device to the server. In hardware phase this is resolved by the fingerprint processor signing the payload with the device API key.
- **No student app yet**: Phone 2 uses the teacher UI for now. A dedicated student screen is on the roadmap.
- **Chat polling**: Chat refreshes every 5 seconds via polling. In production this should be replaced with a Firestore real-time listener (`onSnapshot`).
- **Single school per student**: A student is currently linked to one school. Multi-school support (e.g. for bus routes between campuses) is on the roadmap.

### Roadmap

**v1.1 — Student App**
- Dedicated student screen with check-in and check-out buttons
- Student can view their own journey history

**v1.2 — Admin Dashboard (Web)**
- Next.js web portal for school management
- Full student list, journey history, alert logs
- Configurable alert windows per school

**v1.3 — Real-time Chat**
- Replace polling with Firestore `onSnapshot` listeners
- Typing indicators

**v1.4 — Journey History**
- Parents can view past journeys
- Weekly summary notifications

**v2.0 — Hardware Integration**
- ESP32 firmware
- Fingerprint enrollment portal
- Device management dashboard
- Physical panic button support

**v2.1 — Multi-child / Multi-school**
- Parents with multiple children
- Bus route tracking between campuses

---

## Contributing

This project is under active development. If you are adding a feature:

1. All new routes go in `backend/src/routes/index.js`
2. Business logic goes in `backend/src/services/` — keep controllers thin
3. Constants (new roles, checkpoint types, status values) go in `backend/src/utils/constants.js` AND `mobile/src/constants/index.js`
4. Never put credentials in code — always use environment variables

---

## License

Private — SafeRoute © 2026. All rights reserved.