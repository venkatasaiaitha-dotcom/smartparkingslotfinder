# 🚗 Smart Parking Slot Finder (SmartPark 360)
### WTMP Course Project Evaluation — Project #27
**Evaluation Date:** 16-11-2026 (Monday)

---

## 📌 1. Project Overview & Problem Statement
* **Submitted Project Title:** Smart Parking Slot Finder
* **Problem Statement:** Drivers waste considerable time, fuel, and patience endlessly circulating commercial and urban streets searching for available parking spots.
* **Core Objective:** Build a map-based booking and real-time availability tracking system that allows drivers to locate nearby smart parking facilities, check dynamic slot availability, reserve a slot in advance, and obtain a digital QR barrier pass.

---

## 🛠️ 2. Prescribed Technologies (WTMP Syllabus Compliance)

| Layer | Prescribed Technology | Implementation Details |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, CSS3, Tailwind CSS & Bootstrap 5 | Semantic HTML, glassmorphic dark theme, responsive grid, Bootstrap modals |
| **Client Scripting** | JavaScript (ES6+) | Async/Await, Fetch API, Arrow Functions, Destructuring, LocalStorage |
| **Maps Integration** | Maps API (Leaflet.js + OpenStreetMap) | Interactive GPS map, color-coded availability markers, popups, route navigation |
| **Backend Runtime** | Node.js | Asynchronous event-driven JavaScript server |
| **API Framework** | Express.js (v5) | Modular RESTful routing, CORS, JSON body parsers, centralized error handling |
| **Database** | MongoDB & Mongoose ODM | Local MongoDB instance (`mongodb://127.0.0.1:27017/smart_parking_db`) |
| **Security & Auth** | JWT (`jsonwebtoken`) & `bcryptjs` | 10-round salted password hashing + Bearer token stateless authorization |

---

## 🌐 3. REST API Implementation (All 4 HTTP Methods)

This project strictly follows RESTful principles and implements all required HTTP methods:

### 🟢 GET (Retrieve Data)
* `GET /api/health` — API status and uptime check.
* `GET /api/locations` — Retrieve all parking facilities with aggregated real-time slot counts.
* `GET /api/locations/:id` — Retrieve single parking facility and its bays.
* `GET /api/slots` — Filter slots by `location`, `floor`, `vehicleType`, and `status`.
* `GET /api/slots/:id` — Retrieve specific slot details.
* `GET /api/bookings/my` — Retrieve current authenticated driver's bookings *(JWT Required)*.
* `GET /api/bookings/:id` — Retrieve booking ticket details *(JWT Required)*.
* `GET /api/admin/stats` — Retrieve system analytics, revenue, and occupancy rate *(Admin JWT)*.
* `GET /api/bookings` — Retrieve all bookings across the entire system *(Admin JWT)*.

### 🔵 POST (Create Data)
* `POST /api/auth/register` — Register a new driver or admin (hashes password with `bcryptjs`).
* `POST /api/auth/login` — Authenticate user and issue signed JWT Bearer token.
* `POST /api/bookings` — Create a new parking reservation, assign ticket code, and reserve slot *(JWT Required)*.
* `POST /api/slots` — Create a new parking slot in a facility *(Admin JWT)*.
* `POST /api/locations` — Register a new parking facility with GPS coordinates *(Admin JWT)*.
* `POST /api/admin/simulate-sensor` — Simulate IoT ultrasonic ground sensor trigger (`car_arrived` / `car_departed`) *(Admin JWT)*.
* `POST /api/seed` — 1-click reseed database with demo facilities and slots.

### 🟡 PUT (Update Data)
* `PUT /api/bookings/:id/status` — Update booking lifecycle status (`checked_in` or `completed` which releases slot) *(JWT Required)*.
* `PUT /api/slots/:id` — Update slot rate, vehicle type, or amenities *(Admin JWT)*.
* `PUT /api/slots/:id/toggle` — Rapid toggle of slot availability between available/occupied *(Admin JWT)*.
* `PUT /api/locations/:id` — Update facility details or base hourly rate *(Admin JWT)*.
* `PUT /api/auth/profile` — Update driver profile information *(JWT Required)*.

### 🔴 DELETE (Delete Data)
* `DELETE /api/bookings/:id` — Cancel booking reservation and automatically release the slot back to `available` *(JWT Required)*.
* `DELETE /api/slots/:id` — Remove a slot from facility inventory *(Admin JWT)*.
* `DELETE /api/locations/:id` — Delete a parking facility and all its associated slots *(Admin JWT)*.

---

## 🗄️ 4. Database Schema Design (MongoDB & Mongoose)

```
┌─────────────────┐       ┌─────────────────┐
│     User        │       │    Location     │
├─────────────────┤       ├─────────────────┤
│ _id (ObjectId)  │       │ _id (ObjectId)  │
│ name (String)   │       │ name (String)   │
│ email (Unique)  │       │ code (String)   │
│ password (Hash) │       │ coordinates     │
│ role (Enum)     │       │ baseRate        │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│    Booking      │◀──────│      Slot       │
├─────────────────┤  N:1  ├─────────────────┤
│ _id (ObjectId)  │       │ _id (ObjectId)  │
│ bookingCode     │       │ slotNumber      │
│ user (Ref User) │       │ location (Ref)  │
│ slot (Ref Slot) │       │ floor           │
│ vehicleNumber   │       │ vehicleType     │
│ durationHours   │       │ hourlyRate      │
│ totalAmount     │       │ status (Enum)   │
│ status (Enum)   │       │ sensorStatus    │
└─────────────────┘       └─────────────────┘
```

---

## 🚀 5. How to Run the Project Locally

### Prerequisites
* **Node.js** (v18+)
* **MongoDB** (running on `mongodb://127.0.0.1:27017`)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Seed the Database
Populates 5 parking facilities, 50 slots, sample reservations, and pre-configured user & admin accounts:
```bash
npm run seed
```

### Step 3: Start the Express Server
```bash
npm start
```
The application will be live at: **`http://localhost:5000`**

---

## 🔑 6. Evaluation Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Demo Administrator** | `admin@smartparking.com` | `admin123` | Full slot CRUD, location CRUD, all bookings, sensor simulator, analytics |
| **Demo Driver (User)** | `user@example.com` | `user123` | Map search, slot filtering, slot booking, ticket pass, check-in, cancel |

*(You can also use the **"Demo"** dropdown in the top navigation bar to sign in with 1 click during evaluation).*

---

## 🎯 7. Live Demonstration Guide for Evaluators

1. **Map View:**
   * Open `http://localhost:5000`.
   * View the interactive OpenStreetMap with 5 parking facilities plotted in Hyderabad.
   * Notice dynamic pin colors: **Green** (&gt;4 free), **Yellow** (1-4 free), **Red** (full).
   * Click any pin to view facility rates, address, and click *"View Slots & Book"* to navigate.

2. **Slot Visualizer & Availability:**
   * Filter slots by Floor, Vehicle Type (EV charger, bike, SUV, accessible), or Status.
   * View the visual parking bay layout.

3. **Booking & QR Permit Pass:**
   * Click an available slot (Green).
   * Enter vehicle registration number (e.g., `TS 09 AB 1234`), choose duration (hours).
   * Confirm booking: slot status immediately flips to **Reserved**, and an instant printable ticket pass with QR code is generated!

4. **User Dashboard ("My Bookings"):**
   * Demonstrate gate arrival by clicking **"Check-in at Gate"** (HTTP PUT &rarr; status becomes `checked_in`, slot becomes `occupied`).
   * Demonstrate exit by clicking **"Check-out & Exit"** (HTTP PUT &rarr; status becomes `completed`, slot releases back to `available`).
   * Demonstrate booking cancellation by clicking **"Cancel Booking"** (HTTP DELETE &rarr; frees slot).

5. **Admin Panel:**
   * Log in as Admin (`admin@smartparking.com`).
   * View live KPIs: Total Revenue, Occupancy Rate, Active Slots.
   * Create a new Slot (HTTP POST `/api/slots`).
   * Trigger the **IoT Ultrasonic Sensor Simulator** (select slot & click *"Car Arrived"* &rarr; slot becomes occupied via hardware event simulation).

6. **Interactive REST API Panel:**
   * Click the **"REST APIs"** tab in the navbar.
   * Show the evaluator all 4 HTTP methods (GET, POST, PUT, DELETE) executed live on screen with response status codes (`200 OK`, `201 Created`) and JSON outputs!

---

## 👥 8. Team Contribution Template (For Lab Viva)

| Team Member Name | Roll Number | Key Contribution Area |
| :--- | :--- | :--- |
| **Member 1** | *[Insert Roll #]* | Backend Express REST APIs (GET, POST, PUT, DELETE) & Centralized Error Handling |
| **Member 2** | *[Insert Roll #]* | MongoDB Schema Design (User, Location, Slot, Booking) & Mongoose CRUD Integration |
| **Member 3** | *[Insert Roll #]* | JWT Authentication Middleware, bcryptjs Password Hashing & Role-based Access |
| **Member 4** | *[Insert Roll #]* | Frontend UI Design (Tailwind CSS, Bootstrap 5), Leaflet Map Integration & Booking Ticket Generator |
