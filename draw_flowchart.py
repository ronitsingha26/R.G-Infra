import os
from PIL import Image, ImageDraw, ImageFont

def main():
    # 1. Create a large, high-res canvas (2600 x 3800) for extremely crisp rendering
    width = 2600
    height = 3800
    # Background color: Deep midnight slate blue (#0B0F19)
    bg_color = (11, 15, 25)
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # 2. Set up font styling with fallbacks
    font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    font_bold_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    
    if not os.path.exists(font_path):
        font_path = "Arial"
    if not os.path.exists(font_bold_path):
        font_bold_path = "Arial Bold"

    try:
        font_main_title = ImageFont.truetype(font_bold_path, 46)
        font_main_sub = ImageFont.truetype(font_path, 20)
        font_section_header = ImageFont.truetype(font_bold_path, 24)
        font_node_title = ImageFont.truetype(font_bold_path, 16)
        font_node_subtitle = ImageFont.truetype(font_path, 11)
        font_bold = ImageFont.truetype(font_bold_path, 13)
        font_node_body = ImageFont.truetype(font_path, 12)
        font_legend = ImageFont.truetype(font_path, 13)
    except Exception:
        # Fallback if custom fonts are unavailable
        font_main_title = ImageFont.load_default()
        font_main_sub = ImageFont.load_default()
        font_section_header = ImageFont.load_default()
        font_node_title = ImageFont.load_default()
        font_node_subtitle = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_node_body = ImageFont.load_default()
        font_legend = ImageFont.load_default()

    # 3. Dynamic Text Wrapper to prevent text overflow
    def draw_text_wrapped(draw_obj, text, position, max_w, font, fill_color, line_spacing=4):
        words = text.split(' ')
        lines = []
        current_line = []
        
        for word in words:
            if '\n' in word:
                parts = word.split('\n')
                for i, part in enumerate(parts):
                    if i > 0:
                        lines.append(' '.join(current_line))
                        current_line = []
                    if part:
                        current_line.append(part)
            else:
                test_line = current_line + [word]
                # Measure text width
                bbox = draw_obj.textbbox((0, 0), ' '.join(test_line), font=font)
                w = bbox[2] - bbox[0]
                if w <= max_w:
                    current_line = test_line
                else:
                    lines.append(' '.join(current_line))
                    current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
            
        x, y = position
        for line in lines:
            draw_obj.text((x, y), line, font=font, fill=fill_color)
            bbox = draw_obj.textbbox((0, 0), "A", font=font)
            h = bbox[3] - bbox[1]
            y += h + line_spacing
        return y

    # 4. Premium Node Drawer with Card layout & custom header blocks
    def draw_node(title, subtitle, bullets, x1, y1, x2, y2, theme_color, bg_card_color=(21, 30, 46)):
        # Draw outer rounded rectangle card
        draw.rounded_rectangle([x1, y1, x2, y2], radius=15, fill=bg_card_color, outline=theme_color, width=3)
        
        # Header block height
        header_h = 45 if subtitle else 35
        # Fill header block with theme color
        draw.rounded_rectangle([x1, y1, x2, y1 + header_h], radius=15, fill=theme_color)
        # Square off the bottom of the header block to look clean
        draw.rectangle([x1, y1 + header_h - 10, x2, y1 + header_h], fill=theme_color)
        
        # Write Title and Subtitle in Header
        draw.text((x1 + 15, y1 + 8), title, font=font_node_title, fill=(255, 255, 255))
        if subtitle:
            draw.text((x1 + 15, y1 + 26), subtitle, font=font_node_subtitle, fill=(226, 232, 240))
            
        # Draw Bullets and Content
        y = y1 + header_h + 15
        for bullet in bullets:
            if bullet.startswith("**") and bullet.endswith("**"):
                # Subheading
                subheader_text = bullet.replace("**", "")
                draw.text((x1 + 15, y), subheader_text, font=font_bold, fill=theme_color)
                bbox = draw.textbbox((0, 0), "A", font=font_bold)
                y += (bbox[3] - bbox[1]) + 8
            elif bullet.strip() == "---":
                # Horizontal Divider Line
                draw.line([x1 + 15, y + 5, x2 - 15, y + 5], fill=(51, 65, 85), width=1)
                y += 12
            else:
                # Standard Bullet
                draw.text((x1 + 15, y), "•", font=font_node_body, fill=theme_color)
                text_x = x1 + 28
                y = draw_text_wrapped(draw, bullet, (text_x, y), (x2 - text_x - 15), font=font_node_body, fill_color=(226, 232, 240))
                y += 4

    # 5. Core Color Themes
    COLOR_FRONTEND = (0, 180, 255)      # Cool Blue-Cyan for Frontend Client
    COLOR_BACKEND = (168, 85, 247)      # Vivid Purple for Backend API
    COLOR_PERSISTENCE = (244, 63, 94)   # Rose Red for MySQL Database
    COLOR_FLOW_INFO = (52, 211, 153)    # Emerald Green for Integrations/Flows
    COLOR_GRAY_BORDER = (71, 85, 105)   # Charcoal Gray for outer frames

    # ==========================================
    # HEADER TITLE BLOCK
    # ==========================================
    draw.rounded_rectangle([80, 40, 2520, 180], radius=20, fill=(30, 41, 59), outline=(71, 85, 105), width=2)
    draw.text((120, 60), "R.G INFRA CRM — SYSTEM ARCHITECTURE & FULL DATA FLOW MAP", font=font_main_title, fill=(255, 255, 255))
    draw.text((120, 125), "Complete Visual Blueprint of the Real Estate ERP & Construction Client Management System  •  Active Domain: prakashamgroup.com", font=font_main_sub, fill=(203, 213, 225))

    # Grid columns
    col1_x1, col1_x2 = 120, 860     # Width: 740 (Property, Landing Web, Core Security)
    col2_x1, col2_x2 = 920, 1720    # Width: 800 (Dashboard, Clients, Financials Engine)
    col3_x1, col3_x2 = 1780, 2480   # Width: 700 (Core Assets, Services, Logs Systems)

    # =========================================================================
    # LAYER 1: FRONTEND LAYER (Y: 240 to 1080)
    # =========================================================================
    # Container frame
    draw.rounded_rectangle([80, 240, 2520, 1080], radius=20, fill=(15, 23, 42), outline=COLOR_GRAY_BORDER, width=2)
    draw.text((120, 265), "LAYER 1: PRESENTATION LAYER  —  REACT + TYPESCRIPT SINGLE PAGE APPLICATION (SPA)", font=font_section_header, fill=COLOR_FRONTEND)

    # Left Box: Public Landing Website
    draw_node(
        title="Public Landing Website (13 Modules)",
        subtitle="Served from Express Static /dist (Port 5173 Dev)",
        bullets=[
            "**Core Features & Integrations**",
            "Lenis Smooth Scrolling Engine implementation",
            "ThemeLock Layer (Force dark/luxury construction theme)",
            "ScrollReveal utility for dynamic Framer Motion reveals",
            "Contact Form: directly saves inquiries to MySQL DB",
            "---",
            "**Visual Layout Components**",
            "Navbar.tsx: Sticky smooth scrolling header menu",
            "Hero.tsx: Massive project branding & video canvas",
            "About.tsx: Company introduction & founder profiles",
            "Services.tsx: Infrastructure development capabilities",
            "ProjectsShowcase.tsx: Dynamic interactive grids of properties",
            "StatsBand.tsx: Animated counter numbers (e.g. Flats built)",
            "WhyChooseUs.tsx: Premium feature matrices & USPs",
            "Testimonials.tsx: Slideshow of customer reviews",
            "Team.tsx: Leadership crew with beautiful avatar shapes",
            "ProcessTimeline.tsx: Construction milestones timeline walkthrough",
            "CTABanner.tsx: Dynamic 'Schedule Visit' action triggers",
            "Contact.tsx: Customer query submission portal (leads generation)",
            "Footer.tsx: Sitemap, legal notices, active copyrights"
        ],
        x1=col1_x1, y1=320, x2=col1_x2, y2=1040,
        theme_color=COLOR_FRONTEND
    )

    # Center Box: Admin Portal UI (Protected Dashboard & Ops Page Nodes)
    # Split the center column into a sub-grid of page tiles
    sub_col1_x1, sub_col1_x2 = col2_x1 + 20, col2_x1 + 380
    sub_col2_x1, sub_col2_x2 = col2_x1 + 420, col2_x2 - 20

    # Row 1: Dashboard vs Property Management
    draw_node(
        title="Portal Dashboard Page",
        subtitle="DashboardPage.tsx (24KB complex charts)",
        bullets=[
            "Live Stats: Collection totals, due ratios",
            "Recharts & Chart.js widgets: Collection",
            "trends, apartment sales, stage progress",
            "Overdue Accounts Alert Box (Immediate Red Alert)",
            "Recent Ledger Payments log table"
        ],
        x1=sub_col1_x1, y1=320, x2=sub_col1_x2, y2=480,
        theme_color=COLOR_FRONTEND
    )
    draw_node(
        title="Property Hierarchy Portal",
        subtitle="ProjectsPage.tsx & ProjectDetailPage.tsx",
        bullets=[
            "Structural View: Property -> Apartment Complex",
            "-> Tower Block -> Flats units list manager",
            "Property CRUD Editor at all hierarchical tiers",
            "Unit Booking Toggles: Available, Reserved, Booked"
        ],
        x1=sub_col2_x1, y1=320, x2=sub_col2_x2, y2=480,
        theme_color=COLOR_FRONTEND
    )

    # Row 2: Clients vs Financials & Receipts
    draw_node(
        title="Client & Buyer Directory",
        subtitle="ClientsPage.tsx & ClientDetailPage.tsx",
        bullets=[
            "Complete Buyer CRM profile records",
            "Assigned Flat Allotment records & IDs",
            "Interactive chronological Purchase Logs",
            "Customer Details (Dues stats, history notes)"
        ],
        x1=sub_col1_x1, y1=500, x2=sub_col1_x2, y2=660,
        theme_color=COLOR_FRONTEND
    )
    draw_node(
        title="Payments Recorder & Receipts",
        subtitle="PaymentsPage.tsx & Invoices generation",
        bullets=[
            "Record Client Flat purchase payments",
            "Generate PDF Receipts & detailed invoices",
            "Auto receipt email delivery trigger",
            "Payment history review sheets & search"
        ],
        x1=sub_col2_x1, y1=500, x2=sub_col2_x2, y2=660,
        theme_color=COLOR_FRONTEND
    )

    # Row 3: Stage Milestones vs Communications
    draw_node(
        title="Payment Milestones Config",
        subtitle="PaymentSchedulePage.tsx (32KB core page)",
        bullets=[
            "100% stage weights setup per flat",
            "Due date tracker per client installment",
            "Milestones: Booking (10%) -> Agreement (20%)",
            "-> Plinth (15%) -> Slab (15%) -> Possession (20%)"
        ],
        x1=sub_col1_x1, y1=680, x2=sub_col1_x2, y2=840,
        theme_color=COLOR_FRONTEND
    )
    draw_node(
        title="Comms Logs & Dues Alerts",
        subtitle="CommunicationHistoryPage.tsx & Actions",
        bullets=[
            "Track PDF Demand Letters dispatch states",
            "Email & WhatsApp communication logs",
            "Manual payment reminder alerts panel",
            "SettingsPage.tsx (Admin profile edit & lock)"
        ],
        x1=sub_col2_x1, y1=680, x2=sub_col2_x2, y2=840,
        theme_color=COLOR_FRONTEND
    )

    # Row 4: Data Exports vs Contact Inquiries
    draw_node(
        title="Backup & Data Export Hub",
        subtitle="BackupDataPage.tsx (Database export controller)",
        bullets=[
            "Choose datasets: All, Dues, Clients, Receipts",
            "Compile custom backups dynamically (XLS, CSV)"
        ],
        x1=sub_col1_x1, y1=860, x2=sub_col1_x2, y2=1040,
        theme_color=COLOR_FRONTEND
    )
    draw_node(
        title="Contact Leads Console",
        subtitle="ContactSubmissionsPage.tsx (Leads tracker)",
        bullets=[
            "List forms submissions from Public website",
            "Inquiry review logs, toggle read/unread status"
        ],
        x1=sub_col2_x1, y1=860, x2=sub_col2_x2, y2=1040,
        theme_color=COLOR_FRONTEND
    )

    # Right Box: Frontend Core Infrastructure (Auth, Fetch API, Sockets)
    draw_node(
        title="Frontend Core Infrastructure",
        subtitle="Portal Connection Engines & Global State",
        bullets=[
            "**Auth Context (auth.tsx)**",
            "Persistent session validation via local token check",
            "Redirect to Login page if credentials expire",
            "Role checks (Admin, Staff, Accountant limits)",
            "---",
            "**Central API Client (api.ts - 24KB)**",
            "Axios-like structured fetch wraps",
            "Auto headers injection (Bearer JWT Token)",
            "Global HTTP error hook (auto-redirect to Login)",
            "---",
            "**Real-time Syncer (socket.ts)**",
            "Socket.IO Client WebSocket connection",
            "Listens for 'data_changed' broadcast",
            "Automatic cache invalidation & UI data re-fetch",
            "---",
            "**Global Context Store (store.tsx)**",
            "Apartments & Clients global memory cache",
            "BrandedLoader & Toast notifications alerts"
        ],
        x1=col3_x1, y1=320, x2=col3_x2, y2=1040,
        theme_color=COLOR_FRONTEND
    )

    # =========================================================================
    # BRIDGING LAYER: API REQUESTS & WEBSOCKETS (Y: 1100 to 1260)
    # =========================================================================
    # Left Flow Box (REST API Calls)
    draw.rounded_rectangle([120, 1110, 1260, 1210], radius=10, fill=(24, 38, 56), outline=COLOR_FLOW_INFO, width=2)
    draw.text((150, 1130), "REST API GATEWAY  —  HTTPS REQUESTS (PORT 5001)", font=font_section_header, fill=COLOR_FLOW_INFO)
    draw.text((150, 1170), "Headers: 'Authorization: Bearer <JWT_TOKEN>'  •  Payload: JSON Data  •  Routes: Auth, Clients, Payments, Schedules, backups", font=font_node_body, fill=(226, 232, 240))

    # Right Flow Box (Real-time socket)
    draw.rounded_rectangle([1340, 1110, 2480, 1210], radius=10, fill=(24, 38, 56), outline=COLOR_FLOW_INFO, width=2)
    draw.text((1370, 1130), "REAL-TIME BROADCASTS  —  SOCKET.IO WEB-SOCKET CHANNEL", font=font_section_header, fill=COLOR_FLOW_INFO)
    draw.text((1370, 1170), "Instantly notifies Frontend of changes on Backend (e.g. payment_recorded, client_updated, reminders_done) -> UI Auto-Refreshes", font=font_node_body, fill=(226, 232, 240))

    # Connectors Downward from Layer 1 to HTTP / Socket channels
    draw.line([300, 1040, 300, 1110], fill=COLOR_FRONTEND, width=4)
    draw.polygon([(300, 1110), (294, 1100), (306, 1100)], fill=COLOR_FRONTEND)

    draw.line([1100, 1040, 1100, 1110], fill=COLOR_FRONTEND, width=4)
    draw.polygon([(1100, 1110), (1094, 1100), (1106, 1100)], fill=COLOR_FRONTEND)

    draw.line([1480, 1040, 1480, 1110], fill=COLOR_FRONTEND, width=4)
    draw.polygon([(1480, 1110), (1474, 1100), (1486, 1100)], fill=COLOR_FRONTEND)

    draw.line([2280, 1040, 2280, 1110], fill=COLOR_FRONTEND, width=4)
    draw.polygon([(2280, 1110), (2274, 1100), (2286, 1100)], fill=COLOR_FRONTEND)

    # =========================================================================
    # LAYER 2: BACKEND LAYER (Y: 1250 to 2230)
    # =========================================================================
    # Container frame
    draw.rounded_rectangle([80, 1250, 2520, 2230], radius=20, fill=(15, 23, 42), outline=COLOR_GRAY_BORDER, width=2)
    draw.text((120, 1275), "LAYER 2: APPLICATION & SERVICE LAYER  —  EXPRESS.JS + NODE.JS CONTROLLER ENGINES", font=font_section_header, fill=COLOR_BACKEND)

    # Connectors from HTTP channel to Middleware Shield
    draw.line([300, 1210, 300, 1330], fill=COLOR_FLOW_INFO, width=4)
    draw.polygon([(300, 1330), (294, 1320), (306, 1320)], fill=COLOR_FLOW_INFO)

    draw.line([1100, 1210, 1100, 1330], fill=COLOR_FLOW_INFO, width=4)
    draw.polygon([(1100, 1330), (1094, 1320), (1106, 1320)], fill=COLOR_FLOW_INFO)

    # Connectors from Socket.io channel to Socket Server
    draw.line([2280, 1210, 2280, 1330], fill=COLOR_FLOW_INFO, width=4)
    draw.polygon([(2280, 1330), (2274, 1320), (2286, 1320)], fill=COLOR_FLOW_INFO)

    # Left Column: Security Shield & Request Pre-processors
    draw_node(
        title="Middleware Shield & Guards",
        subtitle="Security, Rate Limiting & Auth Controls",
        bullets=[
            "**API Security Controllers**",
            "Helmet Shield: Adds HTTP Headers (prevent XSS / Sniffing)",
            "CORS Layer: Whitelist domain filter ('prakashamgroup.com')",
            "Gzip Compression: Compresses Express JSON output payloads",
            "Rate Limiter: Lockouts brute force attempts on /login route",
            "---",
            "**Authentication Middleware (auth.js)**",
            "Intercepts API routes with JWT token verifier",
            "Decodes user data payload (Role, User ID, Profile)",
            "Blocks unauthorized route requests (throws HTTP 401)",
            "Extracts authorization metadata for auditing logs"
        ],
        x1=col1_x1, y1=1330, x2=col1_x2, y2=2190,
        theme_color=COLOR_BACKEND
    )

    # Center Column: API Route Handlers (15 core modules)
    draw_node(
        title="REST API Route Controllers (15 Modules)",
        subtitle="Express API Routing Endpoints  (server.js router mappings)",
        bullets=[
            "**Authentication & Security Router (auth.js)**",
            "Routes: Login validations, update profile details, change passwords",
            "---",
            "**Property Layout Routers**",
            "properties.js: Create / List housing complexes properties",
            "apartments.js: Control complexes, block maps & Towers listings",
            "flats.js: Control flat units specifications, dimensions & prices",
            "projects.js: Maintain property records structure compatibility",
            "---",
            "**Financial & Ledger Routers (Core Engine Mappings)**",
            "clients.js: CRUD operations on flats buyers & financial details logs",
            "paymentStages.js: Configure master percentages (Booking -> Possession)",
            "paymentSchedules.js: Core schedules router; process stages payments",
            "payments.js: Legacy transaction recorder, invoices list & email PDF triggers",
            "backups.js: Format MySQL records into Excel sheets & raw CSV files",
            "---",
            "**Automation & Analytics Routers**",
            "dashboard.js: Pre-calculate complex analytical metrics for charts",
            "demandLetters.js: Trigger automated PDF demand letters compiling",
            "communications.js: Expose communication logs history and metrics",
            "reminders.js: Record cron notifications & trigger manual reminders",
            "contact.js: Route user inquiry forms from landing page directly to DB"
        ],
        x1=col2_x1, y1=1330, x2=col2_x2, y2=2190,
        theme_color=COLOR_BACKEND
    )

    # Right Column: Backend Core Services (Ledger, Cron, PDF, SMTP)
    draw_node(
        title="Business Logic & Core Services",
        subtitle="Automated Cron, Ledger Engines & Document Generators",
        bullets=[
            "**Payment Ledger (paymentLedger.js)**",
            "The Core Financial Carry-Forward Engine",
            "Distributes buyer payments chronologically to unpaid stages",
            "Calculates stage statuses: Unpaid -> Part-Paid -> Fully-Paid",
            "Computes remaining dues & carry-forwards surplus cash",
            "---",
            "**Due Reminder Cron (dueReminderCron.js)**",
            "Daily node-cron execution scheduled for 9:00 AM IST",
            "Finds active overdue stages -> groups unpaid details per client",
            "Auto triggers PDF Demand Letter builder",
            "Fires SMTP Email reminder with PDF attachment",
            "Auto records status alerts to Database reminder logs",
            "Emits Socket.io event: refresh admin client dashboard UI",
            "---",
            "**PDF Generation Engine (services/pdf/)**",
            "demandLetterPdf.js: Compile legal letterhead PDFs",
            "invoicePdf.js: Compile official payments receipts",
            "---",
            "**Nodemailer SMTP (utils/mailer.js)**",
            "Gmail SMTP 2FA token connection handler",
            "Rich HTML email template compiler (emailTemplates.js)",
            "---",
            "**Socket.IO Server Hub**",
            "Broadcasts real-time events to all active Admin dashboards"
        ],
        x1=col3_x1, y1=1330, x2=col3_x2, y2=2190,
        theme_color=COLOR_BACKEND
    )

    # =========================================================================
    # PERSISTENCE INTERFACE: DATABASE POOL & DRIVERS (Y: 2230 to 2380)
    # =========================================================================
    draw.rounded_rectangle([120, 2260, 2480, 2350], radius=10, fill=(24, 38, 56), outline=COLOR_FLOW_INFO, width=2)
    draw.text((150, 2280), "DATABASE INTERFACE LAYER  —  MYSQL2 PROMISE CONNECTION POOL (config/db.js)", font=font_section_header, fill=COLOR_FLOW_INFO)
    draw.text((150, 2315), "Manages high-throughput MySQL socket connections pooling  •  Executes safe parameterized raw queries  •  Thread pool recycling", font=font_node_body, fill=(226, 232, 240))

    # Connectors Downward from Layer 2 to DB Pool
    draw.line([300, 2190, 300, 2260], fill=COLOR_BACKEND, width=4)
    draw.polygon([(300, 2260), (294, 2250), (306, 2250)], fill=COLOR_BACKEND)

    draw.line([1320, 2190, 1320, 2260], fill=COLOR_BACKEND, width=4)
    draw.polygon([(1320, 2260), (1314, 2250), (1326, 2250)], fill=COLOR_BACKEND)

    draw.line([2180, 2190, 2180, 2260], fill=COLOR_BACKEND, width=4)
    draw.polygon([(2180, 2260), (2174, 2250), (2186, 2250)], fill=COLOR_BACKEND)

    # =========================================================================
    # LAYER 3: PERSISTENCE LAYER (Y: 2380 to 3650)
    # =========================================================================
    # Container frame
    draw.rounded_rectangle([80, 2380, 2520, 3650], radius=20, fill=(15, 23, 42), outline=COLOR_GRAY_BORDER, width=2)
    draw.text((120, 2405), "LAYER 3: DATABASE LAYER  —  MYSQL RELATIONAL DATABASE ENGINE (18+ TABLES)", font=font_section_header, fill=COLOR_PERSISTENCE)

    # Connectors from DB Pool to Database columns
    draw.line([300, 2350, 300, 2460], fill=COLOR_FLOW_INFO, width=4)
    draw.polygon([(300, 2460), (294, 2450), (306, 2450)], fill=COLOR_FLOW_INFO)

    draw.line([1320, 2350, 1320, 2460], fill=COLOR_FLOW_INFO, width=4)
    draw.polygon([(1320, 2460), (1314, 2450), (1326, 2450)], fill=COLOR_FLOW_INFO)

    draw.line([2180, 2350, 2180, 2460], fill=COLOR_FLOW_INFO, width=4)
    draw.polygon([(2180, 2460), (2174, 2450), (2186, 2450)], fill=COLOR_FLOW_INFO)

    # Left Column: Housing & Units Master Schema
    draw_node(
        title="Property Hierarchy Tables",
        subtitle="Housing Assets & Complex Units Layout Schemas",
        bullets=[
            "**`properties` (Complex Master)**",
            "Tracks core projects list (id, name, physical_address)",
            "---",
            "**`apartments` (Sub-divisions)**",
            "Links complexes to properties (property_id, name, parking_slots)",
            "---",
            "**`towers` (Blocks Structure)**",
            "Tower buildings list (apartment_id, name, floor_count)",
            "---",
            "**`flats` (Housing Units Master)**",
            "Individual units records (tower_id, flat_number, floor, area, value, status: available/reserved/booked)",
            "---",
            "**`infrastructure_details` (Flat Assets)**",
            "Additional components mapping (flat_id, water_allotment, corpus_fund, electricity_source_id, transformer_id)",
            "---",
            "**`parking_allotments` (Slots Master)**",
            "Links parking slot numbers to booked flat units (slot_number, flat_id)",
            "---",
            "**`transformers` (Utility assets)**",
            "Maintains site transformers capacities (name, capacity, location)",
            "---",
            "**`electricity_sources` (Grid details)**",
            "Grid specs for flat unit connections (provider, meter_prefix)"
        ],
        x1=col1_x1, y1=2460, x2=col1_x2, y2=3610,
        theme_color=COLOR_PERSISTENCE
    )

    # Center Column: Clients, Ledger & Payment schedules schemas
    draw_node(
        title="Client Registry & Ledger Schema",
        subtitle="Core Financial Ledger & Payment Transactions Schemas",
        bullets=[
            "**`clients` (Buyers Master Registry)**",
            "Profile of buyers (unique_client_id, name, email, phone, PAN, flat_id)",
            "---",
            "**`bookings` (Sales Log)**",
            "Records active booking transactions (client_id, flat_id, flat_value, booking_amount, status)",
            "---",
            "**`payment_plans` (Milestones Templates)**",
            "Apartment structures plans presets (apartment_id, plan_name, gst_percent)",
            "---",
            "**`payment_installments` (Preserve Weights)**",
            "Installment percentages templates list (plan_id, stage_name, percentage, stage_order)",
            "---",
            "**`payment_stages` (Global Milestone Presets)**",
            "Global defaults (Booking 10%, Agreement 20%, Plinth 15%, Slab 15%, Possession 20%)",
            "---",
            "**`payment_schedules` (Active Buyer Installments)**",
            "Individually tracks schedule per buyer stage (client_id, stage_name, amount, due_date, status: paid/unpaid/partial)",
            "---",
            "**`client_payments` (Transactions Ledger)**",
            "Records actual money payments received (client_id, amount, gst_amount, reference_no, mode: cash/online, payment_date)",
            "---",
            "**`dues` (Cached Ledger Status)**",
            "Speeds up queries by caching states (client_id, total_paid, total_due, current_active_due_stage)"
        ],
        x1=col2_x1, y1=2460, x2=col2_x2, y2=3610,
        theme_color=COLOR_PERSISTENCE
    )

    # Right Column: System Logs, Audit Logs & Comms schemas
    draw_node(
        title="System Operations & Analytics Schema",
        subtitle="Audit Trail, Automated Triggers & Communications Schemas",
        bullets=[
            "**`demand_letters` (Document Archives)**",
            "Stores history of PDFs generated (client_id, file_url, due_amount, email_sent, whatsapp_sent, generated_date)",
            "---",
            "**`communication_history` (Notification Logs)**",
            "Logs SMTP emails & WA redirects (client_id, channel: email/whatsapp, message_type: billing/reminder, timestamp, status)",
            "---",
            "**`communication_logs` (API Triggers Status)**",
            "Delivery checks log details (recipient, payload, message_id)",
            "---",
            "**`contact_submissions` (Leads Inflow)**",
            "Website visitor queries leads (name, phone, email, project_type, message, submission_time, is_read)",
            "---",
            "**`reminder_logs` (Overdue Reminders Tracker)**",
            "Logs cron activities (client_id, due_date, email_status, trigger_type: cron/manual)",
            "---",
            "**`audit_logs` (Security Trail)**",
            "Track database modifications (user_id, action: edit/delete, entity, old_values_json, new_values_json, change_date)",
            "---",
            "**`notifications` (Internal Alerts)**",
            "Staff workspace alert feeds (user_id, title, message, is_read)",
            "---",
            "**`backup_logs` (Data Exports Archiver)**",
            "Tracks XLS & CSV manual extracts (file_name, status, created_by)"
        ],
        x1=col3_x1, y1=2460, x2=col3_x2, y2=3610,
        theme_color=COLOR_PERSISTENCE
    )

    # =========================================================================
    # FOOTER & LEGEND PANEL
    # =========================================================================
    draw.rounded_rectangle([80, 3680, 2520, 3760], radius=15, fill=(30, 41, 59), outline=COLOR_GRAY_BORDER, width=2)
    draw.text((120, 3702), "DIAGRAM LEGEND & METRICS:", font=font_bold, fill=(255, 255, 255))
    
    # Legend Color Boxes
    # Frontend
    draw.rectangle([380, 3705, 410, 3725], fill=COLOR_FRONTEND)
    draw.text((425, 3705), "Client-Side React SPA Modules", font=font_legend, fill=(226, 232, 240))
    # Backend
    draw.rectangle([780, 3705, 810, 3725], fill=COLOR_BACKEND)
    draw.text((825, 3705), "Express Server API Controllers", font=font_legend, fill=(226, 232, 240))
    # Database
    draw.rectangle([1180, 3705, 1210, 3725], fill=COLOR_PERSISTENCE)
    draw.text((1225, 3705), "MySQL Database Tables (18+ Schema)", font=font_legend, fill=(226, 232, 240))
    # Integrations
    draw.rectangle([1580, 3705, 1610, 3725], fill=COLOR_FLOW_INFO)
    draw.text((1625, 3705), "REST API & WebSocket Connectors", font=font_legend, fill=(226, 232, 240))

    # Details
    draw.text((2150, 3705), "Generated: May 2026  |  Lead Developer: Ronit Singha", font=font_bold, fill=(203, 213, 225))

    # 6. Save the high resolution flowchart
    output_path = "flowchart.png"
    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Flowchart successfully compiled and saved to: {output_path}")

if __name__ == "__main__":
    main()
