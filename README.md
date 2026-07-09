# HITAM Student Track Explorer

A unified platform designed to manage academic tracks, monitor Career Development Centre (CDC) performance, and coordinate multi-stack project allocations.

---

## 🌟 Services Offered

Our platform provides key modules and services to support students, administrators, and coordinators throughout the academic and career development lifecycle:

### 1. 🎯 Track Exploration & Pathway Matching
* **Career Pathway Insights:** Detailed breakdowns of curriculum details, industry demand, and career progression paths for various specialized tracks.
* **Structured Enrollment Workflows:** Self-service enrollment interface allowing students to select their specialized academic track within designated batch schedules.
* **Prerequisites & Guidance:** Informative resources to help students align their choices with future career aspirations.

### 2. 📊 CDC Performance Analytics
* **Aptitude & Technical Tracking:** Aggregated recording of aptitude scores, mock interview grades, and coding test metrics.
* **Student Dashboard Insights:** Dynamic progress charts and feedback logs to help students visualize performance trends and pinpoint improvement areas.
* **Placement Readiness Scoring:** Evaluates performance thresholds to determine student readiness for upcoming placement drives.

### 3. 💼 Multi-Stack Project & Internship Portal
* **Collaboration Workspace:** Portal for students to view, pitch, and register for multi-stack development projects.
* **Internship Registry:** Unified catalog of student internships, tracking roles, companies, durations, and project achievements.
* **Verification & Selection Pipelines:** Coordinator-led approval queues for project topics, team rosters, and internship records.

### 4. 🔄 Automated Google Sheets Data Sync
* **External Integration:** Bi-directional sync utilities that connect directly with academic and placement spreadsheets.
* **Custom Field Mapping:** Interactive header-mapping tools that accommodate diverse sheet structures without altering core database models.
* **On-Demand Synchronization:** Live updates to ensure the application's student directory is always aligned with administrative spreadsheets.

### 5. 🛠️ Administrative Operations Dashboard
* **Batch Scheduling Control:** Schedule-maker tool to open and close registration windows for track enrollment and project submissions.
* **Role & User Access Management:** Role-based permissions configuring student access, CDC analyst tools, and admin overrides.
* **Database & Integrity Management:** Verification panels to run database migrations, check-ups, and schema adjustments.

---

## 💻 Tech Stack

* **Frontend:** React, Vite, CSS
* **Backend:** FastAPI (Python), SQLAlchemy ORM, SQLite Database
* **Integrations:** Google Sheets API, Google OAuth

---

## ⚙️ Quick Setup

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.10 or higher)

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Abhineeth-23/cdc-tracks.git
   cd student-track-explorer
   ```

2. **Backend Installation:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. **Frontend Installation:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---
*Developed for HITAM Student Track and Career Development Centre Management.*
