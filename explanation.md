# 📋 R.G INFRA CRM — Complete Project Explanation

> **Project Name:** R.G INFRA CRM (Real Estate Customer Relationship Management System)  
> **Client:** Bajaj Developer Construction / Prakasham Group  
> **Domain:** Real Estate / Construction Company  
> **Live Domain:** prakashamgroup.com  
> **Hosting:** Hostinger (VPS Node.js Hosting)  
> **Last Updated:** May 2026

---

## 📌 Table of Contents

1. [Project Overview](#1--project-overview)
2. [Technology Stack](#2--technology-stack)
3. [Project Architecture](#3--project-architecture)
4. [Folder Structure](#4--folder-structure)
5. [Database Design (MySQL)](#5--database-design-mysql)
6. [Backend — API & Services](#6--backend--api--services)
7. [Frontend — UI & Pages](#7--frontend--ui--pages)
8. [Authentication & Security](#8--authentication--security)
9. [Key Features — Detailed Breakdown](#9--key-features--detailed-breakdown)
10. [Real-Time Features (Socket.IO)](#10--real-time-features-socketio)
11. [Automated Cron Jobs](#11--automated-cron-jobs)
12. [PDF Generation](#12--pdf-generation)
13. [Email & WhatsApp Communication](#13--email--whatsapp-communication)
14. [Deployment & Hosting](#14--deployment--hosting)
15. [Environment Variables](#15--environment-variables)
16. [How to Run Locally](#16--how-to-run-locally)
17. [API Endpoints Reference](#17--api-endpoints-reference)
18. [User Roles & Permissions](#18--user-roles--permissions)
19. [Data Flow Diagrams](#19--data-flow-diagrams)
20. [Future Scope & Enhancements](#20--future-scope--enhancements)

---

## 1. 🏗️ Project Overview

**R.G INFRA CRM** ek full-stack web application hai jo ek **real estate / construction company** ke liye banaya gaya hai. Iska purpose hai company ke **properties, apartments, flats, clients, bookings, payments, dues, demand letters, aur communications** ko ek hi jagah se manage karna.

### Kya karta hai ye system?

| Feature | Description |
|---------|-------------|
| **Property Management** | Multiple properties, apartments, towers, aur flats ko manage karta hai |
| **Client Management** | Har buyer/client ka complete record — contact info, flat allotment, purchase history |
| **Booking System** | Flat booking with status tracking (available → reserved → booked) |
| **Payment Tracking** | Stage-wise payment tracking with milestones (Booking → Agreement → Plinth → Slab → Brickwork → Possession) |
| **Demand Letters** | Automated PDF demand letters generate aur email/WhatsApp se bhejo |
| **Due Reminders** | Automated daily cron job jo overdue payments ke reminders bhejta hai |
| **Analytics Dashboard** | Charts aur graphs ke saath real-time analytics — collection trends, due vs paid, apartment sales |
| **Communication Logs** | Har email, WhatsApp, demand letter ka complete history |
| **Data Backup & Export** | Excel/CSV me data export for backup |
| **Landing Website** | Public-facing company website with contact form |

### Ek Line me:
> Ye ek **ERP-style CRM** hai jo real estate company ko unke **flat sales, payments, dues, aur client communication** ko digitally manage karne deta hai.

---

## 2. 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.x | UI framework (component-based) |
| **TypeScript** | 6.x | Type-safe JavaScript |
| **Vite** | 8.x | Build tool & dev server (super fast) |
| **React Router DOM** | 7.x | Client-side routing (SPA navigation) |
| **TailwindCSS** | 3.x | Utility-first CSS framework |
| **Framer Motion** | 12.x | Smooth animations & page transitions |
| **Recharts** | 3.x | Dashboard charts & graphs |
| **Chart.js + react-chartjs-2** | 4.x | Additional charting library |
| **Lucide React** | 1.x | Beautiful icon library |
| **Socket.IO Client** | 4.x | Real-time updates from server |
| **Lenis** | 1.x | Smooth scroll experience |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 4.x | REST API framework |
| **MySQL2** | 3.x | Database driver (promise-based) |
| **JSON Web Token (JWT)** | 9.x | Token-based authentication |
| **bcryptjs** | 2.x | Password hashing |
| **Nodemailer** | 8.x | Email sending (Gmail SMTP) |
| **PDFMake** | 0.2.x | PDF generation (demand letters, invoices) |
| **node-cron** | 4.x | Scheduled cron jobs |
| **Socket.IO** | 4.x | Real-time WebSocket server |
| **Helmet** | 8.x | Security headers |
| **CORS** | 2.x | Cross-origin resource sharing |
| **Compression** | 1.x | Gzip response compression |
| **express-rate-limit** | 8.x | Rate limiting (brute-force protection) |

### Database
| Technology | Purpose |
|-----------|---------|
| **MySQL** | Relational database (hosted on Hostinger) |

### Deployment
| Technology | Purpose |
|-----------|---------|
| **Hostinger VPS** | Production hosting |
| **PM2** | Process manager (auto-restart, logging) |
| **Vite Build** | Frontend production build |

---

## 3. 🏛️ Project Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           React + TypeScript + Vite (SPA)             │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ Landing  │  │  Login Page   │  │  Admin Portal  │  │  │
│  │  │  Website │  │              │  │  (Protected)   │  │  │
│  │  └──────────┘  └──────────────┘  └────────────────┘  │  │
│  │         │              │                │             │  │
│  │         └──────────────┼────────────────┘             │  │
│  │                        │                              │  │
│  │              REST API Calls (fetch)                   │  │
│  │              + Socket.IO (real-time)                   │  │
│  └────────────────────────┼──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
                     ┌──────┴──────┐
                     │   INTERNET   │
                     └──────┬──────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                      SERVER SIDE                            │
│  ┌────────────────────────┼──────────────────────────────┐  │
│  │           Express.js + Node.js (Port 5001)            │  │
│  │                        │                              │  │
│  │  ┌─────────┐  ┌───────┴───────┐  ┌───────────────┐   │  │
│  │  │  Auth   │  │  15+ Route    │  │   Services     │   │  │
│  │  │  Guard  │  │   Modules     │  │  (Cron, PDF,   │   │  │
│  │  │ (JWT)   │  │  (REST APIs)  │  │   Email, etc)  │   │  │
│  │  └─────────┘  └───────────────┘  └───────────────┘   │  │
│  │                        │                              │  │
│  │              ┌─────────┴─────────┐                    │  │
│  │              │   MySQL Database   │                    │  │
│  │              │  (18+ Tables)      │                    │  │
│  │              └───────────────────┘                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  PM2 Process Manager → Auto-restart, Logging                │
│  Hostinger VPS → Reverse Proxy → Express                    │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Type: **Monolithic Full-Stack Application**
- **Frontend** React app Vite se build hoke `backend/dist/` me jaata hai
- **Backend** Express server production me dono serve karta hai — API + Static files
- **Development me** Vite dev server (port 5173) + Express API (port 5001) alag chalte hain
- **Production me** Express sab kuch serve karta hai ek hi port se

---

## 4. 📁 Folder Structure

```
bajaj developers/
│
├── 📄 ecosystem.config.cjs     # PM2 config (Hostinger deploy ke liye)
├── 📄 schema.sql                # Master database schema (all tables)
├── 📄 dummy_data.sql            # Test/seed data
├── 📄 check_db.js               # DB connection test script
│
├── 📂 backend/                  # ──── NODE.JS + EXPRESS API ────
│   ├── 📄 server.js             # Main entry point (Express app)
│   ├── 📄 package.json          # Backend dependencies
│   ├── 📄 .env                  # Environment variables (SECRET!)
│   ├── 📄 .env.example          # Template for env vars
│   ├── 📄 schema.sql            # Backend-specific schema
│   ├── 📄 seed.js               # Database seeder
│   │
│   ├── 📂 config/
│   │   └── 📄 db.js             # MySQL connection pool (mysql2/promise)
│   │
│   ├── 📂 middleware/
│   │   └── 📄 auth.js           # JWT token verification middleware
│   │
│   ├── 📂 routes/               # ──── ALL API ROUTE FILES ────
│   │   ├── 📄 auth.js           # Login, register, profile, password
│   │   ├── 📄 properties.js     # CRUD properties
│   │   ├── 📄 apartments.js     # CRUD apartments
│   │   ├── 📄 flats.js          # CRUD flats
│   │   ├── 📄 clients.js        # CRUD clients + history
│   │   ├── 📄 payments.js       # Legacy payment management
│   │   ├── 📄 paymentStages.js  # Payment milestone stages config
│   │   ├── 📄 paymentSchedules.js # Per-client payment schedules & dues
│   │   ├── 📄 projects.js       # Legacy project management
│   │   ├── 📄 dashboard.js      # Dashboard stats + analytics
│   │   ├── 📄 demandLetters.js  # PDF generation + email/WhatsApp
│   │   ├── 📄 communications.js # Communication history logs
│   │   ├── 📄 contact.js        # Public contact form submissions
│   │   ├── 📄 reminders.js      # Due reminder logs & manual trigger
│   │   └── 📄 backups.js        # Data export (XLS/CSV)
│   │
│   ├── 📂 services/             # ──── BUSINESS LOGIC ────
│   │   ├── 📄 dueReminderCron.js    # Automated daily due reminder cron
│   │   ├── 📄 paymentLedger.js      # Dues recalculation engine
│   │   └── 📂 pdf/
│   │       ├── 📄 demandLetterPdf.js # Demand letter PDF template
│   │       ├── 📄 invoicePdf.js      # Invoice PDF template
│   │       ├── 📄 helpers.js         # PDF utility functions
│   │       └── 📄 styles.js          # PDF styling constants
│   │
│   ├── 📂 utils/                # ──── UTILITIES ────
│   │   ├── 📄 mailer.js         # Nodemailer setup (Gmail SMTP)
│   │   └── 📄 emailTemplates.js # HTML email templates
│   │
│   ├── 📂 templates/            # ──── DOCUMENT TEMPLATES ────
│   │   ├── 📄 demandLetter.js   # Demand letter document template
│   │   └── 📄 invoice.js        # Invoice document template
│   │
│   ├── 📂 generated_demand_letters/  # Auto-generated PDF files
│   ├── 📂 generated_invoices/        # Auto-generated invoice PDFs
│   └── 📂 dist/                      # Frontend build output (production)
│
└── 📂 frontend/                 # ──── REACT + TYPESCRIPT APP ────
    ├── 📄 index.html            # HTML entry point
    ├── 📄 vite.config.ts        # Vite build + proxy configuration
    ├── 📄 package.json          # Frontend dependencies
    ├── 📄 tailwind.config.js    # TailwindCSS configuration
    ├── 📄 tsconfig.json         # TypeScript configuration
    │
    └── 📂 src/
        ├── 📄 main.tsx          # React app bootstrap
        ├── 📄 App.tsx           # Root component + Router
        ├── 📄 index.css         # Global styles + Tailwind imports
        │
        ├── 📂 assets/           # Images, logos, SVGs
        │
        ├── 📂 components/       # ──── SHARED COMPONENTS ────
        │   ├── 📄 BrandedLoader.tsx      # Loading spinner
        │   ├── 📄 ScrollProgressBar.tsx  # Page scroll indicator
        │   ├── 📄 ScrollReveal.tsx       # Scroll-triggered animations
        │   ├── 📄 SectionHeading.tsx     # Reusable section headers
        │   ├── 📄 SmoothScroll.tsx       # Lenis smooth scroll
        │   └── 📄 ThemeLock.tsx          # Force dark/light theme
        │
        ├── 📂 sections/         # ──── LANDING PAGE SECTIONS ────
        │   ├── 📄 Navbar.tsx
        │   ├── 📄 Hero.tsx
        │   ├── 📄 About.tsx
        │   ├── 📄 Services.tsx
        │   ├── 📄 ProjectsShowcase.tsx
        │   ├── 📄 StatsBand.tsx
        │   ├── 📄 WhyChooseUs.tsx
        │   ├── 📄 Testimonials.tsx
        │   ├── 📄 Team.tsx
        │   ├── 📄 ProcessTimeline.tsx
        │   ├── 📄 CTABanner.tsx
        │   ├── 📄 Contact.tsx
        │   └── 📄 Footer.tsx
        │
        ├── 📂 pages/            # ──── PUBLIC PAGES ────
        │   ├── 📄 LandingPage.tsx    # Company website homepage
        │   └── 📄 LoginPage.tsx      # Admin login page
        │
        ├── 📂 portal/           # ──── ADMIN PORTAL (PROTECTED) ────
        │   ├── 📄 api.ts             # API client (all fetch calls)
        │   ├── 📄 auth.tsx           # Auth context + provider
        │   ├── 📄 socket.ts          # Socket.IO client
        │   ├── 📄 store.tsx          # Global state management
        │   ├── 📄 toast.tsx          # Toast notification system
        │   ├── 📄 ui.tsx             # Reusable UI components
        │   ├── 📄 search.tsx         # Global search component
        │   ├── 📄 portalNav.ts       # Sidebar navigation config
        │   ├── 📄 PortalLayout.tsx   # Dashboard layout (sidebar + topbar)
        │   ├── 📄 PortalSidebar.tsx  # Left sidebar navigation
        │   ├── 📄 PortalTopbar.tsx   # Top navigation bar
        │   ├── 📄 ProtectedPortal.tsx # Auth guard (redirect if not logged in)
        │   ├── 📄 RequireRole.tsx    # Role-based access control
        │   ├── 📄 BrandLogo.tsx      # Logo component
        │   ├── 📄 LoginSplash.tsx    # Login page branding
        │   │
        │   └── 📂 pages/            # ──── PORTAL PAGES ────
        │       ├── 📄 DashboardPage.tsx           # Main dashboard with stats & charts
        │       ├── 📄 ClientsPage.tsx             # Client listing + CRUD
        │       ├── 📄 ClientDetailPage.tsx        # Individual client details
        │       ├── 📄 ClientHistoryPage.tsx       # All clients dues overview
        │       ├── 📄 ProjectsPage.tsx            # Property/Apartment management
        │       ├── 📄 ProjectDetailPage.tsx       # Individual project details
        │       ├── 📄 PaymentsPage.tsx            # Payment records
        │       ├── 📄 PaymentSchedulePage.tsx     # Stage-wise payment schedules
        │       ├── 📄 CommunicationHistoryPage.tsx # Email/WhatsApp logs
        │       ├── 📄 CommunicationActions.tsx    # Send email/WhatsApp actions
        │       ├── 📄 ReminderLogsPage.tsx        # Due reminder history
        │       ├── 📄 BackupDataPage.tsx          # Data export/backup
        │       ├── 📄 ContactSubmissionsPage.tsx  # Website contact form leads
        │       └── 📄 SettingsPage.tsx            # User profile & password
        │
        ├── 📂 hooks/            # Custom React hooks
        │   ├── 📄 useCountUpOnView.ts  # Number count-up animation
        │   └── 📄 useTheme.ts          # Theme toggle hook
        │
        └── 📂 lib/              # Utility functions
            ├── 📄 download.ts   # File download helper
            └── 📄 theme.ts      # Theme management
```

---

## 5. 🗄️ Database Design (MySQL)

### Total Tables: **18+**

Database ka design **hierarchical** hai — Property → Apartment → Tower → Flat → Client → Booking → Payment.

### Entity Relationship Summary:

```
PROPERTIES (1)
  └── APARTMENTS (Many)
        └── TOWERS (Many)
              └── FLATS (Many)
                    └── CLIENTS (1:1 per flat)
                          ├── BOOKINGS (1 active per flat)
                          ├── PAYMENT_SCHEDULES (Multiple stages)
                          ├── CLIENT_PAYMENTS (Multiple transactions)
                          ├── DUES (1 computed record)
                          ├── DEMAND_LETTERS (Multiple)
                          ├── COMMUNICATION_HISTORY (Multiple)
                          └── REMINDER_LOGS (Multiple)
```

### Detailed Table Descriptions:

#### Core Tables

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 1 | `users` | Admin/staff login accounts | user_id, name, email, password, role (admin/staff/accountant) |
| 2 | `properties` | Top-level real estate properties | name, address |
| 3 | `apartments` | Apartment complexes within a property | property_id, name, total_flats, parking_slots |
| 4 | `towers` | Towers/blocks within an apartment | apartment_id, name, floor_count |
| 5 | `flats` | Individual flat units | apartment_id, tower_id, flat_number, floor, sbu_area, total_amount, status (available/reserved/booked) |

#### Client & Booking Tables

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 6 | `clients` | Flat buyers/customers | unique_client_id, name, phone, email, pan_aadhaar, flat_id, purchase_date |
| 7 | `bookings` | Flat booking records | booking_id, client_id, flat_id, booking_date, flat_value, booking_amount, status |

#### Infrastructure Tables

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 8 | `infrastructure_details` | Per-flat infrastructure info | flat_id, parking_allotment, transformer, corpus_fund, electricity, water |
| 9 | `parking_allotments` | Parking slot master data | apartment_id, flat_id, slot_number, status |
| 10 | `transformers` | Transformer details | apartment_id, name, capacity, location |
| 11 | `electricity_sources` | Electricity provider info | apartment_id, provider, meter_prefix |

#### Payment Tables (CORE BUSINESS LOGIC)

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 12 | `payment_plans` | Apartment-wise payment plan templates | apartment_id, name, gst_percent |
| 13 | `payment_installments` | Installment stages within a plan | payment_plan_id, stage_name, percentage, stage_order |
| 14 | `payment_stages` | Global milestone definitions | stage_name, percentage, stage_order |
| 15 | `payment_schedules` | **Per-client stage-wise breakdown** | client_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status |
| 16 | `client_payments` | **Actual payment transactions** | client_id, amount, gst_amount, payment_date, payment_mode, reference_no |
| 17 | `dues` | **Computed pending dues per client** | client_id, total_flat_amount, total_paid, total_due, current_stage, combined_due |

#### Communication & Tracking Tables

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 18 | `demand_letters` | Generated demand letter PDFs | client_id, file_url, total_amount, paid_amount, due_amount, email_sent, whatsapp_sent |
| 19 | `communication_history` | Every email/WhatsApp sent | client_id, type, channel, status, recipient_email |
| 20 | `communication_logs` | Detailed comm logs with provider info | client_id, channel, message_type, delivery_status, provider_message_id |
| 21 | `contact_submissions` | Website contact form entries | name, phone, email, project_type, message, is_read |
| 22 | `reminder_logs` | Due reminder tracking | client_id, stage_name, due_date, email_sent, whatsapp_initiated, trigger_type |

#### System Tables

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 23 | `audit_logs` | Every data change tracked | user_id, action, entity_type, old_values (JSON), new_values (JSON) |
| 24 | `notifications` | In-app notifications | user_id, title, message, type, is_read |
| 25 | `backup_logs` | Backup export tracking | file_name, status, created_by |

### Default Payment Stages (Pre-seeded):

| Order | Stage Name | Percentage |
|-------|-----------|-----------|
| 1 | Booking Amount | 10% |
| 2 | Agreement Signing | 20% |
| 3 | Plinth Level | 15% |
| 4 | First Slab | 15% |
| 5 | Brickwork & Plaster | 20% |
| 6 | Possession | 20% |

> **Total = 100%** of flat value

---

## 6. ⚙️ Backend — API & Services

### Server Setup (`server.js`)

Backend Express server pe run hota hai with:

- **CORS** — Configured for production domain + localhost dev
- **Helmet** — Security headers (XSS protection, etc.)
- **Compression** — Gzip for faster responses
- **Rate Limiting** — Login endpoint pe 20 attempts/15min
- **Socket.IO** — Real-time events
- **JSON body parser** — 10MB limit
- **Static file serving** — Production me frontend build serve karta hai
- **Graceful shutdown** — PM2/Hostinger ke liye SIGTERM/SIGINT handling

### Route Modules (15 files):

| Route File | Base Path | Description |
|-----------|-----------|-------------|
| `auth.js` | `/api/auth` | Login, register, me, profile update, password change, forgot password |
| `properties.js` | `/api/properties` | CRUD properties |
| `apartments.js` | `/api/apartments` | CRUD apartments with towers |
| `flats.js` | `/api/flats` | CRUD flats with status management |
| `clients.js` | `/api/clients` | Full client CRUD + client history with dues |
| `payments.js` | `/api/payments` | Legacy payment tracking + receipt email + invoices |
| `paymentStages.js` | `/api/payment-stages` | Admin manages milestone stages + bulk set |
| `paymentSchedules.js` | `/api/payment-schedules` | Generate schedules, record payments, dues calculation |
| `projects.js` | `/api/projects` | Legacy project management |
| `dashboard.js` | `/api/dashboard` | Stats, due alerts, analytics (trends, sales, due-vs-paid) |
| `demandLetters.js` | `/api/demand-letters` | Generate PDF, send via email/WhatsApp, download |
| `communications.js` | `/api/communications` | View/delete communication logs + stats |
| `contact.js` | `/api/contact` | Public contact form + admin view |
| `reminders.js` | `/api/reminders` | View reminder logs, stats, manual trigger |
| `backups.js` | `/api/backups` | Export data as XLS/CSV |

### Key Services:

#### 1. Payment Ledger (`paymentLedger.js`)
- **Purpose:** Dues recalculation engine
- **Logic:** Carry-forward system — jab payment aata hai, wo pehle stages fill karta hai, phir next stage me jaata hai
- Client ka total paid nikalta hai → phir stage-by-stage allocate karta hai → current due aur next due calculate karta hai

#### 2. Due Reminder Cron (`dueReminderCron.js`)
- **Purpose:** Automated daily reminders
- **Schedule:** Daily 9:00 AM IST
- **Flow:** Find overdue schedules → Group by client → Recalculate dues → Generate PDF → Send email → Log everything

#### 3. PDF Generation (`services/pdf/`)
- **Demand Letter PDF:** Professional demand letter with company branding, client details, payment breakdown, GST calculation
- **Invoice PDF:** Payment invoice with receipt details

---

## 7. 🖥️ Frontend — UI & Pages

### Part 1: Public Landing Website

Ye company ka **public-facing website** hai jo visitors ko dikhta hai. Isme 13 sections hain:

| Section | Component | Description |
|---------|-----------|-------------|
| Navigation | `Navbar.tsx` | Sticky navbar with smooth scroll links |
| Hero Banner | `Hero.tsx` | Full-width hero with company tagline |
| About Us | `About.tsx` | Company introduction |
| Services | `Services.tsx` | Construction services offered |
| Projects | `ProjectsShowcase.tsx` | Completed/ongoing project gallery |
| Stats | `StatsBand.tsx` | Animated counter numbers (projects, clients, etc.) |
| Why Choose Us | `WhyChooseUs.tsx` | USPs and differentiators |
| Testimonials | `Testimonials.tsx` | Client reviews/feedback |
| Team | `Team.tsx` | Company leadership team |
| Process | `ProcessTimeline.tsx` | How the construction process works |
| CTA Banner | `CTABanner.tsx` | Call-to-action section |
| Contact | `Contact.tsx` | Contact form (saves to DB) |
| Footer | `Footer.tsx` | Company info, links, copyright |

**Features:**
- Dark theme locked
- Smooth scroll (Lenis)
- Scroll-triggered animations (Framer Motion)
- Animated number counters
- Scroll progress bar

### Part 2: Admin Portal (Protected)

Login ke baad admin ko ye pages milte hain:

| Page | File | Description |
|------|------|-------------|
| **Dashboard** | `DashboardPage.tsx` (24KB!) | Main dashboard — stats cards, charts (collection trend, apartment sales, due vs paid, stage progress), due alerts, recent payments |
| **Clients** | `ClientsPage.tsx` (20KB) | Client listing with search/filter, add/edit/delete clients, flat assignment |
| **Client Detail** | `ClientDetailPage.tsx` | Individual client — all details, payments, demand letters, communication history |
| **Client History** | `ClientHistoryPage.tsx` | All clients ka dues overview — ek table me sabka total paid, due, current stage |
| **Properties** | `ProjectsPage.tsx` (27KB) | Property → Apartment → Tower → Flat hierarchy management, add/edit/delete at each level |
| **Project Detail** | `ProjectDetailPage.tsx` | Individual property details |
| **Payments** | `PaymentsPage.tsx` (19KB) | All payment records, add payment, send receipt, generate invoice |
| **Payment Schedule** | `PaymentSchedulePage.tsx` (32KB!) | Stage-wise schedule per client, generate schedules, set due dates, record payments |
| **Communications** | `CommunicationHistoryPage.tsx` | All email/WhatsApp logs with filters |
| **Due Reminders** | `ReminderLogsPage.tsx` (32KB!) | Reminder history, stats, manual trigger button |
| **Backup** | `BackupDataPage.tsx` | Data export — choose dataset, format (XLS/CSV), date range |
| **Settings** | `SettingsPage.tsx` | User profile edit, password change |

### Portal Infrastructure:

| File | Purpose |
|------|---------|
| `api.ts` (24KB) | **Central API client** — har endpoint ke liye typed functions, auto token management, 401 redirect |
| `auth.tsx` | Auth context — login/logout state, token validation on mount |
| `socket.ts` | Socket.IO client — auto-connect, listen for `data_changed` events |
| `store.tsx` | Global state — apartments, clients data caching |
| `toast.tsx` | Toast notification system |
| `ui.tsx` | Reusable UI components (modals, buttons, inputs, etc.) |
| `ProtectedPortal.tsx` | Auth guard — redirect to login if no token |
| `RequireRole.tsx` | Role-based access — restrict pages by user role |
| `PortalLayout.tsx` | Dashboard shell — sidebar + topbar + content area |

---

## 8. 🔐 Authentication & Security

### How Auth Works:

```
1. User enters userId + password on LoginPage
2. Frontend → POST /api/auth/login
3. Backend verifies password (bcrypt compare)
4. Backend generates JWT token (payload: {id, userId, role})
5. Frontend stores token in localStorage ('abc_token')
6. Every subsequent API call → Authorization: Bearer <token>
7. Backend middleware (auth.js) verifies token on protected routes
8. If token expired/invalid → 401 → Frontend redirects to /login
```

### Security Measures:

| Measure | Implementation |
|---------|---------------|
| **Password Hashing** | bcryptjs (salt rounds: 10) |
| **JWT Tokens** | jsonwebtoken with configurable secret |
| **Rate Limiting** | 20 login attempts per 15 minutes per IP |
| **Helmet** | Security headers (XSS, clickjacking protection) |
| **CORS** | Whitelist-based origin control |
| **Input Validation** | Server-side validation on all routes |
| **Trust Proxy** | Configured for Hostinger reverse proxy |
| **Env Variables** | Secrets in .env (never committed) |

### User Roles:

| Role | Access Level |
|------|-------------|
| `admin` | Full access — all features |
| `staff` | Limited access — view + basic operations |
| `accountant` | Payment & financial data access |

---

## 9. 🌟 Key Features — Detailed Breakdown

### Feature 1: Property Hierarchy Management

```
Property (e.g., "Prakasham Residency")
  └── Apartment (e.g., "Tower A - Premium")
        ├── Tower/Block (e.g., "Block A")
        │     ├── Flat 101 (Floor 1, 1200 sq.ft, ₹45,00,000)
        │     ├── Flat 102 (Floor 1, 1500 sq.ft, ₹55,00,000)
        │     └── Flat 201 (Floor 2, 1200 sq.ft, ₹47,00,000)
        └── Tower/Block (e.g., "Block B")
              ├── Flat 101 ...
              └── Flat 102 ...
```

- Admin property create karta hai
- Usme apartments add karta hai
- Apartments me towers/blocks
- Towers me individual flats with area (sq.ft) aur price
- Flats ka status: `available` → `reserved` → `booked`

### Feature 2: Client Onboarding & Flat Booking

```
Flow:
1. Admin creates client with details (name, phone, email, PAN/Aadhaar)
2. Admin assigns a flat to client → Flat status changes to 'booked'
3. Booking record created with booking_id, date, flat_value, booking_amount
4. Infrastructure details assigned (parking, transformer, electricity)
5. Payment schedule auto-generated based on payment stages
```

### Feature 3: Stage-Wise Payment System (CORE)

Ye project ka **sabse important feature** hai. Real estate me payments milestones pe hoti hain:

```
Example: Flat Value = ₹50,00,000

Stage 1: Booking Amount      → 10% = ₹5,00,000
Stage 2: Agreement Signing   → 20% = ₹10,00,000
Stage 3: Plinth Level        → 15% = ₹7,50,000
Stage 4: First Slab          → 15% = ₹7,50,000
Stage 5: Brickwork & Plaster → 20% = ₹10,00,000
Stage 6: Possession          → 20% = ₹10,00,000
                               ─────────────────
                        Total: 100% = ₹50,00,000
```

**Payment Flow:**
1. Client ka payment aata hai (e.g., ₹12,00,000)
2. System carry-forward logic se allocate karta hai:
   - Stage 1 (₹5L) → Fully paid ✅
   - Stage 2 (₹10L) → ₹7L paid, ₹3L still due (partial) ⚠️
3. Current stage = "Agreement Signing" (₹3L due)
4. Dues table update hota hai

### Feature 4: Demand Letter Generation

```
Flow:
1. Admin selects client → "Generate Demand Letter"
2. System calculates: total amount, paid, due, GST (5%), grand total
3. PDFMake generates professional PDF with:
   - Company letterhead
   - Client details (name, flat, apartment)
   - Payment breakdown table
   - Current dues with GST
   - Bank details for payment
   - Digital signature
4. PDF saved to /generated_demand_letters/
5. Record saved in demand_letters table
6. Option to email PDF as attachment
7. Option to send WhatsApp message with payment link
```

### Feature 5: Automated Due Reminders (Cron)

```
Daily at 9:00 AM IST:

1. Find all payment_schedules where due_date <= today AND status != 'paid'
2. Group by client (one reminder per client)
3. Check: was reminder already sent today? → Skip duplicates
4. Recalculate dues (carry-forward logic)
5. If combined_due > 0:
   a. Generate demand letter PDF
   b. Send email with PDF attachment
   c. Log WhatsApp as 'initiated'
   d. Log to reminder_logs
   e. Log to communication_history
6. Emit Socket.IO event for real-time UI update
```

### Feature 6: Analytics Dashboard

| Chart/Widget | Data Shown |
|-------------|------------|
| **Stats Cards** | Total clients, apartments, flats, booked flats, total sales, total collected, total due |
| **Collection Trend** | Monthly payment collection over time (bar chart) |
| **Apartment Sales** | Per-apartment breakdown — clients, flats sold, total sales, collected, due |
| **Due vs Paid** | Per-client comparison — who paid how much, who owes how much |
| **Stage Progress** | Each payment stage — how many clients at each stage, paid/partial/pending counts |
| **Due Alerts** | Clients with overdue payments (red alerts) |
| **Recent Payments** | Latest payment transactions |

### Feature 7: Communication Tracking

Har ek communication logged hota hai:
- **Email sent** — demand letter, payment receipt, due reminder
- **WhatsApp initiated** — payment confirmation, due reminder
- **Status tracking** — sent, failed, delivered, read
- **Provider message ID** — for delivery tracking

### Feature 8: Data Backup & Export

Admin can export data in XLS or CSV format:

| Dataset | Contents |
|---------|----------|
| `all` | Complete data dump |
| `clients` | All client records with flat & apartment info |
| `payments` | All payment transactions |
| `dues` | Current dues for all clients |
| `schedules` | Payment schedules for all clients |
| `monthly` | Month-wise payment summary |

---

## 10. 🔄 Real-Time Features (Socket.IO)

### How it works:

```
Backend (server.js):
  - Creates Socket.IO server on same HTTP server
  - app.set('io', io) → Makes io accessible in all routes
  - When data changes → io.emit('data_changed', { type: '...', data: ... })

Frontend (socket.ts):
  - Connects to Socket.IO server
  - useSocket() hook listens for 'data_changed' events
  - On event → refetch relevant data → UI updates automatically
```

### Events emitted:

| Event Type | When |
|-----------|------|
| `due_reminders_processed` | After cron job runs |
| `payment_recorded` | When new payment is added |
| `client_updated` | When client data changes |
| `demand_letter_generated` | When new demand letter is created |

---

## 11. ⏰ Automated Cron Jobs

### Due Reminder Cron

| Setting | Value |
|---------|-------|
| **Schedule** | Daily at 9:00 AM IST (3:30 AM UTC) |
| **Library** | node-cron |
| **Timezone** | Asia/Kolkata |
| **Start** | Automatically when server starts |
| **Stop** | On graceful shutdown (SIGTERM/SIGINT) |
| **Manual Trigger** | `POST /api/reminders/trigger` |

---

## 12. 📄 PDF Generation

### Technology: PDFMake

PDFs server-side generate hote hain using PDFMake library.

### Demand Letter PDF includes:
- Company header (R.G INFRA branding)
- Date
- Client name, flat number, apartment name
- Area (sq.ft)
- Payment breakdown table:
  - Total flat value
  - Current stage amount
  - Amount paid so far
  - Due amount
  - GST (5%)
  - Grand total
- Bank details for payment
- Digital signature image (if configured)

### Invoice PDF includes:
- Invoice number (auto-generated)
- Payment details (amount, mode, reference)
- GST breakdown
- Grand total

---

## 13. 📧 Email & WhatsApp Communication

### Email (Nodemailer + Gmail SMTP)

```
Setup:
- Gmail account with App Password (2FA enabled)
- SMTP: smtp.gmail.com, port 587, TLS
- From: "Bajaj Developer Construction <email@gmail.com>"

Types of emails sent:
1. Demand Letter — PDF attachment with payment summary
2. Payment Receipt — Confirmation of payment received
3. Due Reminder — Automated overdue payment alert
4. Invoice — Payment invoice PDF
```

### WhatsApp (URL-based redirect)

```
WhatsApp messages are sent via wa.me URL redirect:
- Format: https://wa.me/91{phone}?text={encoded_message}
- Server generates the URL with pre-filled message
- Admin opens URL → WhatsApp web/app opens with message ready
- Status logged as 'initiated' (since actual send can't be confirmed)
```

---

## 14. 🚀 Deployment & Hosting

### Production Setup on Hostinger:

```
1. Frontend:
   - Run `npm run build` locally in /frontend
   - Build output goes to /frontend/dist
   - Copy /frontend/dist → /backend/dist (Express serves it)

2. Backend:
   - Upload /backend folder to Hostinger
   - Set environment variables in Hostinger panel
   - npm install on server
   - Start with PM2: pm2 start ecosystem.config.cjs --env production

3. PM2 Configuration:
   - Name: rginfra-crm
   - Script: ./backend/server.js
   - Instances: 1 (shared hosting limit)
   - Auto-restart: Yes
   - Max memory: 512MB
   - Logging: ./logs/err.log, ./logs/out.log
```

### URL Structure:

| URL | What it serves |
|-----|---------------|
| `https://prakashamgroup.com/` | Landing website |
| `https://prakashamgroup.com/login` | Admin login |
| `https://prakashamgroup.com/portal/dashboard` | Admin dashboard |
| `https://prakashamgroup.com/api/*` | REST API endpoints |
| `https://prakashamgroup.com/api/health` | Health check |

---

## 15. 🔑 Environment Variables

```env
# Server
NODE_ENV=production
PORT=5001
JWT_SECRET=<random-32-char-string>

# CORS
ALLOWED_ORIGINS=https://prakashamgroup.com,https://www.prakashamgroup.com

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=<hostinger_db_user>
DB_PASS=<hostinger_db_password>
DB_NAME=<hostinger_db_name>
DB_SSL=false

# Email (Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  (App Password)
EMAIL_FROM="Bajaj Developer Construction <your-gmail@gmail.com>"
```

---

## 16. 💻 How to Run Locally

### Prerequisites:
- Node.js 18+
- MySQL installed and running
- Git

### Steps:

```bash
# 1. Clone the repo
git clone <repo-url>
cd bajaj-developers

# 2. Setup Database
mysql -u root -p < schema.sql
# (Optional) Load test data:
mysql -u root -p < dummy_data.sql

# 3. Setup Backend
cd backend
cp .env.example .env
# Edit .env with your local MySQL credentials
npm install
npm run dev   # Starts on port 5001

# 4. Setup Frontend (new terminal)
cd frontend
npm install
npm run dev   # Starts on port 5173

# 5. Open browser
# Landing page: http://localhost:5173
# Login: http://localhost:5173/login
# Default credentials: admin / admin123
```

### Development Proxy:
- Vite dev server (port 5173) proxies `/api/*` requests to Express (port 5001)
- Socket.IO WebSocket upgrade also proxied
- So frontend can call `/api/clients` and it reaches `localhost:5001/api/clients`

---

## 17. 📡 API Endpoints Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Login (rate limited) |
| GET | `/api/auth/me` | ✅ | Get current user |
| PUT | `/api/auth/profile` | ✅ | Update name/email |
| PUT | `/api/auth/password` | ✅ | Change password |
| POST | `/api/auth/forgot-password` | ❌ | Forgot password |

### Properties & Apartments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/properties` | ✅ | List all properties |
| POST | `/api/properties` | ✅ | Create property |
| PUT | `/api/properties/:id` | ✅ | Update property |
| DELETE | `/api/properties/:id` | ✅ | Delete property |
| GET | `/api/apartments` | ✅ | List all apartments |
| POST | `/api/apartments` | ✅ | Create apartment |
| PUT | `/api/apartments/:id` | ✅ | Update apartment |
| DELETE | `/api/apartments/:id` | ✅ | Delete apartment |

### Flats
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/flats` | ✅ | List all flats |
| POST | `/api/flats` | ✅ | Create flat |
| PUT | `/api/flats/:id` | ✅ | Update flat |
| DELETE | `/api/flats/:id` | ✅ | Delete flat |

### Clients
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/clients` | ✅ | List all clients |
| GET | `/api/clients/history` | ✅ | Client history with dues |
| GET | `/api/clients/:id` | ✅ | Get single client detail |
| POST | `/api/clients` | ✅ | Create client |
| PUT | `/api/clients/:id` | ✅ | Update client |
| DELETE | `/api/clients/:id` | ✅ | Delete client |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments` | ✅ | List all payments |
| POST | `/api/payments` | ✅ | Create payment |
| PUT | `/api/payments/:id` | ✅ | Update payment |
| DELETE | `/api/payments/:id` | ✅ | Delete payment |
| POST | `/api/payments/:id/send-receipt` | ✅ | Email receipt |
| POST | `/api/payments/:id/invoices` | ✅ | Generate invoice |

### Payment Stages & Schedules
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment-stages` | ✅ | List payment stages |
| POST | `/api/payment-stages` | ✅ | Create stage |
| POST | `/api/payment-stages/bulk` | ✅ | Bulk set stages |
| POST | `/api/payment-schedules/generate/:clientId` | ✅ | Generate schedule |
| GET | `/api/payment-schedules/client/:clientId` | ✅ | Get client schedule |
| POST | `/api/payment-schedules/pay` | ✅ | Record payment |
| GET | `/api/payment-schedules/dues/:clientId` | ✅ | Get client dues |
| GET | `/api/payment-schedules/pending` | ✅ | All pending dues |

### Demand Letters
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/demand-letters/generate` | ✅ | Generate demand letter PDF |
| GET | `/api/demand-letters` | ✅ | List all demand letters |
| GET | `/api/demand-letters/client/:id` | ✅ | Client's demand letters |
| POST | `/api/demand-letters/send-due-reminder` | ✅ | Send due reminder |
| POST | `/api/demand-letters/send-enhanced-reminder` | ✅ | Enhanced reminder with PDF |
| POST | `/api/demand-letters/whatsapp-payment-done` | ✅ | WhatsApp confirmation |

### Dashboard & Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/stats` | ✅ | Dashboard statistics |
| GET | `/api/dashboard/due-alerts` | ✅ | Overdue payment alerts |
| GET | `/api/dashboard/recent-payments` | ✅ | Recent payments |
| GET | `/api/dashboard/analytics/collection-trend` | ✅ | Monthly collection |
| GET | `/api/dashboard/analytics/apartment-sales` | ✅ | Per-apartment sales |
| GET | `/api/dashboard/analytics/due-vs-paid` | ✅ | Due vs paid comparison |
| GET | `/api/dashboard/analytics/stage-progress` | ✅ | Stage-wise progress |
| GET | `/api/dashboard/analytics/due-list` | ✅ | All dues list |
| GET | `/api/dashboard/analytics/payment-history` | ✅ | Filtered payment history |

### Communications & Reminders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/communications` | ✅ | All communication logs |
| GET | `/api/communications/stats` | ✅ | Communication stats |
| GET | `/api/reminders` | ✅ | Reminder logs |
| GET | `/api/reminders/stats` | ✅ | Reminder stats |
| POST | `/api/reminders/trigger` | ✅ | Manually trigger reminders |

### Backups & Contact
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/backups/summary` | ✅ | Backup data summary |
| GET | `/api/backups/export?format=xls&dataset=all` | ✅ | Download backup |
| POST | `/api/contact` | ❌ | Submit contact form (public) |
| GET | `/api/contact` | ✅ | List contact submissions |
| GET | `/api/health` | ❌ | Server health check |

---

## 18. 👥 User Roles & Permissions

| Feature | Admin | Staff | Accountant |
|---------|-------|-------|------------|
| Dashboard | ✅ | ✅ | ✅ |
| View Clients | ✅ | ✅ | ✅ |
| Add/Edit Clients | ✅ | ✅ | ❌ |
| Delete Clients | ✅ | ❌ | ❌ |
| Manage Properties | ✅ | ✅ | ❌ |
| View Payments | ✅ | ✅ | ✅ |
| Record Payments | ✅ | ✅ | ✅ |
| Generate Demand Letters | ✅ | ✅ | ✅ |
| Send Emails | ✅ | ✅ | ❌ |
| Trigger Reminders | ✅ | ❌ | ❌ |
| Backup/Export | ✅ | ❌ | ✅ |
| Settings | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ |

---

## 19. 🔀 Data Flow Diagrams

### Client Payment Flow:

```
Client pays ₹X
    │
    ▼
Admin → PaymentSchedulePage → "Record Payment"
    │
    ▼
POST /api/payment-schedules/pay
    │
    ├─→ Insert into client_payments table
    │
    ├─→ Recalculate dues (carry-forward):
    │     Stage 1: Paid ✅
    │     Stage 2: Partial ⚠️ (remaining allocated here)
    │     Stage 3-6: Pending ❌
    │
    ├─→ Update payment_schedules (paid_amount, due_amount, status)
    │
    ├─→ Update/Insert dues table (total_paid, total_due, current_stage)
    │
    ├─→ Socket.IO emit → Frontend auto-refreshes
    │
    └─→ Response: { payment_id, dues, schedules }
```

### Demand Letter Flow:

```
Admin → Client Detail → "Generate Demand Letter"
    │
    ▼
POST /api/demand-letters/generate
    │
    ├─→ Fetch client + flat + apartment data
    │
    ├─→ Calculate: total, paid, due, GST (5%), grand total
    │
    ├─→ PDFMake generates PDF → saves to /generated_demand_letters/
    │
    ├─→ Insert into demand_letters table
    │
    ├─→ If send_email=true:
    │     └─→ Nodemailer sends email with PDF attachment
    │         └─→ Log to communication_history
    │
    ├─→ If send_whatsapp=true:
    │     └─→ Generate wa.me URL with pre-filled message
    │         └─→ Log to communication_history (status: 'initiated')
    │
    └─→ Response: { id, file_url, email_sent, whatsapp_url }
```

### Automated Reminder Flow:

```
9:00 AM IST (Daily Cron)
    │
    ▼
Find payment_schedules WHERE due_date <= today AND status != 'paid'
    │
    ▼
Group by client_id
    │
    ▼
For each client:
    │
    ├─→ Already reminded today? → Skip
    │
    ├─→ Recalculate dues (carry-forward)
    │
    ├─→ combined_due <= 0? → Skip
    │
    ├─→ Generate demand letter PDF
    │
    ├─→ Send email with PDF (if email exists)
    │     └─→ Log to communication_history
    │
    ├─→ Log WhatsApp as 'initiated' (if phone exists)
    │     └─→ Log to communication_history
    │
    ├─→ Insert into reminder_logs
    │
    └─→ Socket.IO emit 'due_reminders_processed'
```

---

## 20. 🔮 Future Scope & Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Client Portal** | Clients apne payments khud dekh sakein (read-only portal) |
| **WhatsApp API Integration** | Direct WhatsApp Business API for automated messaging |
| **SMS Notifications** | SMS gateway integration for payment reminders |
| **Mobile App** | React Native app for field staff |
| **Document Upload** | Client documents (Aadhaar, PAN, agreement) upload |
| **Multi-Company Support** | Ek system se multiple construction companies manage |
| **Advanced Analytics** | Predictive analytics, cash flow forecasting |
| **Audit Trail UI** | View audit logs in admin portal |
| **Notification Center** | In-app notifications with real-time bell icon |
| **Receipt Templates** | Customizable receipt/invoice templates |

---

## 📝 Summary

**R.G INFRA CRM** ek production-grade, full-stack CRM application hai jo:

1. ✅ **React + TypeScript** frontend with beautiful landing page + admin portal
2. ✅ **Express.js** backend with 15+ API route modules
3. ✅ **MySQL** database with 18+ well-designed tables
4. ✅ **JWT authentication** with role-based access
5. ✅ **Stage-wise payment** tracking with carry-forward logic
6. ✅ **Automated PDF** demand letter generation
7. ✅ **Email notifications** via Gmail SMTP
8. ✅ **WhatsApp integration** via URL redirect
9. ✅ **Daily cron job** for automated due reminders
10. ✅ **Real-time updates** via Socket.IO
11. ✅ **Analytics dashboard** with charts and graphs
12. ✅ **Data backup/export** in XLS/CSV formats
13. ✅ **Production deployed** on Hostinger with PM2

> **Built for:** Bajaj Developer Construction / Prakasham Group  
> **Purpose:** Digitize and automate real estate flat sales, payments, and client communication  
> **Scale:** Handles multiple properties, hundreds of clients, thousands of payment records

---

*Last generated: May 2026 | Developer: Ronit Singha*
