# Step-by-Step Project Roadmap & Live Execution Tracker

> **Tracking Rule:** Every step must be fully verified and approved before advancing to the next step. Whenever any feature, bug fix, or client change is made, update this document immediately.

---

## 🚦 Overall Project Status: `ALL 12 CORE PHASES COMPLETE & VERIFIED`

| Phase | Description | Progress | Verification Status |
| :--- | :--- | :---: | :---: |
| **Phase 0** | Requirements Analysis & Architecture Definition | 100% | ✅ Completed |
| **Phase 1** | Project Setup & Monorepo Foundation (Vite + Express + DB) | 100% | ✅ Completed & Verified |
| **Phase 2** | Database Migrations & Prisma Schema Setup | 100% | ✅ Completed & Verified |
| **Phase 3** | Authentication & Role-Based Access Control (Admin vs Worker) | 100% | ✅ Completed & Verified |
| **Phase 4** | Company & Material Master Management | 100% | ✅ Completed & Verified |
| **Phase 5** | Raw Material Inward & Company-Wise Stock Ledger | 100% | ✅ Completed & Verified |
| **Phase 6** | Delivery Challan (DC) Module & Print Engine | 100% | ✅ Completed & Verified |
| **Phase 7** | Multi-Month Consolidated GST Invoicing & PDF Engine | 100% | ✅ Completed & Verified |
| **Phase 8** | Customer Payments, Purchases & Expense Tracking | 100% | ✅ Completed & Verified |
| **Phase 9** | Worker Daily Production Tracking & Admin Approval Gate | 100% | ✅ Completed & Verified |
| **Phase 10** | Worker Attendance, Overtime & 26-Day Salary Engine | 100% | ✅ Completed & Verified |
| **Phase 11** | Financial, Stock & Production Analytics Dashboard | 100% | ✅ Completed & Verified |
| **Phase 12** | PWA Installation & Mobile Touch Optimization | 100% | ✅ Completed & Verified (Deployment deferred after testing) |

---

## 📋 Detailed Step-by-Step Execution Plan

### Phase 1: Project Setup & Monorepo Foundation
- [x] Initialize root project folder structure (`frontend/` and `backend/`).
- [x] Setup `frontend`: Vite + React + TypeScript + Tailwind CSS + Lucide Icons + Framer Motion.
- [x] Setup `backend`: Node.js + Express + TypeScript + Prisma + CORS + Helmet.
- [x] Verify both servers start cleanly (`http://localhost:5173` and `http://localhost:5000`).
- [x] **Verification Gate:** Frontend displays pure white canvas (`#FFFFFF`) with modern reference floating dock (Desktop) and responsive hamburger drawer (Mobile); backend responds with `status: 'ok'` to `/api/health`.

### Phase 2: Database Schema & Migration
- [x] Configure local PostgreSQL 18 connection on port 5433 in `backend/.env`.
- [x] Created database `cnc_billing`.
- [x] Write `schema.prisma` with all relational models (Users, Companies, Materials, Stock, DCs, Invoices, Payments, Attendance, Overtime, Production, AuditLog).
- [x] Pushed schema to database and generated type-safe Prisma client (`v6.19.3`).
- [x] Seeded initial data (Admin, Worker Profile, real reference clients: Calmet & Unimech, reference parts: Bracket 428672, SAC 998898).
- [x] Launched Prisma Studio visual dashboard at `http://localhost:5555`.
- [x] **Verification Gate:** Live endpoint `/api/stats` and frontend dynamic pill reflect database synchronization.

### Phase 3: Auth & Security Gate (Admin & Worker)
- [x] Built JWT authentication with `httpOnly` secure cookies and Bearer token fallback.
- [x] Implemented password hashing and verification using `bcryptjs`.
- [x] Implemented Role-Based Access Control (`ADMIN` vs `WORKER`) middleware.
- [x] Designed ultra-clean, minimal Login Screen with one-click Demo credentials (`Admin Demo` and `Worker Demo`).
- [x] Built dedicated **Worker Mobile-Friendly Production Portal**:
  - Part selection, completed pieces, scrap/rejections logging, shift hours, and remarks.
  - Real-time submitted logs list with status badges (`Pending Admin Approval` / `Approved` / `Rejected`).
  - Worker is strictly isolated from financial, pricing, and invoice data.
- [x] Admin dashboard equipped with active session management and logout action.
- [x] **Verification Gate:** Verified end-to-end authentication for both roles, token issuance, and worker daily work logging.

### Phase 4: Company & Material Master Management
- [x] Company CRUD API (`GET /api/companies`, `POST /api/companies`, `PUT /api/companies/:id`, `DELETE /api/companies/:id`) with Zod validation.
- [x] Material / Part CRUD API (`GET /api/materials`, `POST /api/materials`, `PUT /api/materials/:id`, `DELETE /api/materials/:id`) with Zod validation.
- [x] Soft-deactivate protection: prevent accidental deletion of companies/parts if referenced in existing DCs or invoices.
- [x] Immutable Audit Logging for all Company and Material creation and updates.
- [x] Built interactive `CompanyManager` component:
  - Search by name, GSTIN, or contact person.
  - Filters for Active vs Inactive.
  - Slide-in modal for Registering / Editing companies with address, phone, email, opening stock balance, and GSTIN formatting.
- [x] Built interactive `MaterialManager` component:
  - Search by component name, drawing number, or part number.
  - Pre-sets for Indian CNC Job Work SAC code `998898` and GST rate `18.0%`.
  - Slide-in modal for Registering / Editing components with default machining rates and UOM (`nos`, `pcs`, `kg`, `sets`).
- [x] Integrated into main dashboard navigation under `Companies` and `Materials & Parts`.
- [x] **Verification Gate:** Tested API endpoints with authenticated admin token, verified frontend modal forms, live search, and error feedback.

### Phase 5: Raw Material Inward & Company-Wise Stock Ledger
- [x] Raw Material Receipt API (`POST /api/stock/receipts`, `GET /api/stock/receipts`) with customer delivery note number, transporter vehicle, and weight in kg.
- [x] Automatic company-wise stock ledger generation with running balance calculation.
- [x] Company-wise stock ledger API (`GET /api/stock/ledger?companyId=...`) and consolidated summary API (`GET /api/stock/summary`).
- [x] Stock movement & issue API (`POST /api/stock/movement`) with **negative stock prevention** rule enforced at database and API levels.
- [x] Built interactive `StockManager` component:
  - **KPIs:** Total Workshop Stock in kg, Total Inward Slips, and Negative Stock Protection status.
  - **View 1:** Customer Inward Receipts table with search, customer DC numbers, vehicle tracking, and slide-in "+ Record Inward Stock" modal.
  - **View 2:** Chronological Company Stock Ledger with company selector ribbon, movement badges (`INWARD_RECEIPT`, `ISSUED_MACHINING`, `SCRAP_WASTAGE`, `RETURNED_RAW`), in/out quantities, and running balance.
  - Slide-in modal to Issue raw material to machining or record scrap.
- [x] Integrated into dashboard navigation under `Raw Stock & Ledgers` and dashboard quick link `Open Full Stock Ledger`.
- [x] **Verification Gate:** Tested receipt creation (1,250 kg for Calmet), verified stock ledger balance, verified negative stock prevention rejection on over-issue attempt (attempting to issue 2,000 kg returned 400 error).

### Phase 6: Delivery Challan (DC) Module & Print Engine
- [x] Sequential continuous DC numbering engine starting from integer `1` (or next sequential from `368`).
- [x] Next available DC number API: `GET /api/dcs/next-number`.
- [x] Delivery Challan CRUD API (`GET /api/dcs`, `GET /api/dcs/:id`, `POST /api/dcs`, `PUT /api/dcs/:id/cancel`).
- [x] Invoicing status lifecycle: `PENDING_INVOICING` $\rightarrow$ `INVOICED` $\rightarrow$ `CANCELLED`.
- [x] Built interactive `DeliveryChallanManager` component:
  - Metrics: Total Challans, Ready for Invoicing, and Invoiced counts.
  - Filters: `All Dispatches`, `Pending Invoicing`, `Invoiced`, and `Cancelled`.
  - Multi-line dynamic part dispatch form: auto-fills customer address/GSTIN, customer PO reference, part numbers, drawing numbers, and quantities.
  - Safe cancellation with mandatory reason logging (locked against reuse; blocked if already invoiced).
- [x] Built pixel-perfect `DCPrintView` component replicating the physical sample (`DC bill reference.jpeg`):
  - **Header:** Shri Varshini Technologies, Saravanampatti, Coimbatore, GSTIN: `33AGSFS0004K1Z8`.
  - Consignee To Box, DC Number, Date, Customer Order No & Date.
  - Declaration: *"Sir, Please receive the following goods and return the duplicate copy duly signed."*
  - Itemized table with Total Dispatched Quantity.
  - Signatures: Left: *"Received the goods in good condition"* + Customer Signature with Seal; Right: *For SHRI VARSHINI TECHNOLOGIES* + Authorised Signatory.
  - `@media print` CSS: Hides navigation bars/buttons, strictly prints on standard A4 portrait paper.
- [x] **Verification Gate:** Generated reference DC `#368` (360 pcs Bracket 428672 for Calmet Engineering), verified next sequential generation (`#369`), and verified print layout.

### Phase 7: Multi-Month Consolidated GST Invoicing & PDF Engine
- [x] Sequential FY-based invoice numbering format `XXX/YYYY-YY` (starting from `#069/2026-27`).
- [x] Next available invoice number API (`GET /api/invoices/next-number`).
- [x] Pending DCs query endpoint (`GET /api/invoices/pending-dcs?companyId=...`) enabling multi-month selection.
- [x] Indian Number-to-Words generator (`numberToIndianWords`) for Rupees & Paise.
- [x] Invoice CRUD API with transactional atomic updates (`GET /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices`, `PUT /api/invoices/:id/cancel`).
- [x] Real-time GST calculation engine:
  - Intra-State (Tamil Nadu `33`): CGST 9% + SGST 9%.
  - Inter-State: IGST 18%.
  - Mathematical round-off and grand total.
- [x] Safe cancellation with atomic reversion of linked Delivery Challans back to `PENDING_INVOICING`.
- [x] Built interactive `InvoiceManager` component:
  - Metrics cards: Total Invoices, Total Invoiced Amount (₹), Outstanding Due (₹), Realized Collection (₹).
  - Status filters: `All Invoices`, `Unpaid Due`, `Partially Paid`, `Paid`, `Cancelled`.
  - Multi-step "+ Generate Tax Invoice" modal:
    - Step 1: Select Customer & pick multi-month Delivery Challans with interactive checklist.
    - Step 2: Auto-compiled parts table with editable unit rates and live tax calculation preview.
- [x] Built pixel-perfect `InvoicePrintView` component replicating the physical bills (`invoice bill reference 1 & 2.jpeg`):
  - **Header:** Shri Varshini Technologies, Saravanampatti, Coimbatore, GSTIN: `33AGSFS0004K1Z8`.
  - Two-column grid with Buyer (Bill To), Invoice No, Date, Buyer's Order No/Date, SVT DC Reference.
  - Itemized table with SAC `998898`, 18% GST rate, quantities, rates, and amounts.
  - Tax breakdown ledger, amount in words, bank details (Axis Bank Saravanampatti A/c `376700060000060`), and authorised signature block.
  - `@media print` styling strictly formatted for standard A4 portrait printing.
- [x] **Verification Gate:** Created reference Invoice `#069/2026-27` consolidating DC `#368` (₹31,860.00), verified next number auto-increment to `#070/2026-27`, verified cancellation & DC reversion safety, verified production build with zero errors.

### Phase 8: Customer Payments, Purchases & Expenses
- [x] Customer Payments API (`GET /api/payments`, `POST /api/payments`, `DELETE /api/payments/:id`):
  - Atomic invoice status & balance due update (`UNPAID` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID`).
  - Supports On-Account payments and specific Invoice linking.
  - Safe reversal/deletion restoring invoice balances.
- [x] Workshop Purchases API (`GET /api/expenses/purchases`, `POST /api/expenses/purchases`, `DELETE /api/expenses/purchases/:id`):
  - Categories: Tooling (inserts, cutters), Coolant/Oil, Spares, Consumables, Hardware.
  - Supplier bill number, quantity, unit price, and total amount calculation.
- [x] Operating Utilities & Overheads API (`GET /api/expenses/operating`, `POST /api/expenses/operating`, `DELETE /api/expenses/operating/:id`):
  - Categories: Electricity (EB), Workshop Rent, Machine Maintenance, Transport/Diesel, Staff Welfare/Tea, Office/Admin.
- [x] Consolidated Outflow Analytics API (`GET /api/expenses/summary`): Real-time breakdown of total purchases, operating utilities, and gross outflow.
- [x] Built interactive `PaymentManager` component:
  - Financial KPIs: Total Inward Collections (₹), Current Month Receipts (₹), Total Transactions.
  - Filter pills: `All Modes`, `NEFT / RTGS`, `UPI / GPay`, `Cheque`, `Cash`.
  - Slide-in "+ Record Customer Payment" modal with customer invoice selector showing live balance due.
  - Reversible payment receipts table with audit trail.
- [x] Built interactive `ExpenseManager` component:
  - Sub-tabs for `Workshop Purchases & Tooling` and `Operating Expenses & Utilities`.
  - Outflow KPIs: Gross Workshop Outflow, Tooling & Spares Total, Monthly Utilities Total.
  - "+ Add Tooling / Spare Purchase" slide-in modal with live total value calculation.
  - "+ Record Utility Expense" slide-in modal for EB power bills, workshop rent, and maintenance.
- [x] Integrated into main dashboard navigation under `Payments & Ledgers` and `Purchases & Spares`.
- [x] **Verification Gate:** Tested partial payment (₹20,000 $\rightarrow$ `PARTIALLY_PAID`), settlement payment (₹11,860 $\rightarrow$ `PAID`), recorded carbide insert tooling purchase (₹3,500), recorded TANGEDCO EB power bill (₹8,450), verified outflow summary (₹11,950), and verified clean frontend production build.

### Phase 9: Worker Daily Production & Approval Gate
- [x] Worker Daily Work submission API (`POST /api/worker/daily-work`) with company, part, finished quantity, scrap/rejection quantity, and shift hours.
- [x] Admin Approval Gate API (`PUT /api/worker/daily-work/:id/approve` & `PUT /api/worker/daily-work/:id/reject` with revision remarks).
- [x] Production Summary & Scrap Analytics API (`GET /api/worker/production/summary`): Approved output, scrap count, defect rate (%), and pending approval queue.
- [x] Operator Roster & Profile Management API (`GET /api/worker/profiles` & `POST /api/worker/profiles`).
- [x] Built interactive `ProductionManager` component:
  - Top KPI cards: Approved Finished Output, Pending Approvals, Defect / Scrap Rate (%), Active Machine Operators.
  - Sub-tab 1: **Daily Production Queue** with instant Approve / Return actions and status filters (`PENDING`, `APPROVED`, `REJECTED`, `ALL`).
  - Sub-tab 2: **Worker Roster** with operator details, employee IDs, base salaries, and registration modal.
  - Sub-tab 3: **Manual Work Log** allowing admins to record shop floor output directly.
- [x] Integrated into main dashboard navigation under `Workers & Production`.
- [x] Mobile Worker Portal verified: Workers can log work from mobile devices and track approval status in real-time.
- [x] **Verification Gate:** Tested worker production logging (120 finished pcs, 2 scrap pcs $\rightarrow$ `PENDING`), admin one-click approval ($\rightarrow$ `APPROVED`), new operator registration (*Murugan S* / `SVT-OP-02`), and clean frontend production build.

### Phase 10: Attendance, Overtime & 26-Day Salary Engine
- [x] Standard 26-Day Monthly Attendance API (`GET /api/salary/attendance`, `POST /api/salary/attendance`) with present days, unpaid absent days, and daily wage rate derivation.
- [x] Overtime (OT) Engine API (`GET /api/salary/overtime`, `POST /api/salary/overtime`, `PUT /api/salary/overtime/:id/approve`, `PUT /api/salary/overtime/:id/reject`).
- [x] Extra Shift Engine API (`GET /api/salary/extra-shifts`, `POST /api/salary/extra-shifts`, `PUT /api/salary/extra-shifts/:id/approve`).
- [x] 26-Day Salary Calculation Engine (`POST /api/salary/generate`):
  - Daily Rate: $\text{Base Salary} / 26$.
  - Absence Deduction: $\text{Unpaid Days} \times \text{Daily Rate}$.
  - Overtime Pay: $\sum \text{Approved OT Hours} \times \text{OT Rate}$.
  - Extra Shift Pay: $\sum \text{Approved Shifts} \times \text{Shift Allowance}$.
  - Net Payable: $\text{Base Salary} - \text{Absence Deduct} + \text{OT Pay} + \text{Shift Pay}$.
- [x] Built interactive `SalaryManager` component:
  - Financial KPIs: Total Monthly Net Payroll, Approved OT Pay, Extra Shifts Allowance, Unpaid Absence Deductions.
  - Sub-tab 1: **26-Day Payroll & Salary Slips** with cycle selector, instant payslip generation, and mark as paid action.
  - Sub-tab 2: **Overtime (OT) Log** with one-click approve/reject gate.
  - Sub-tab 3: **Extra Shifts** tracking.
- [x] Built professional printable `PayslipPrintView` component:
  - Standard CNC workshop payslip layout with 26-day breakdown, present/absent days, earnings vs deductions, Net Salary in words, and signature blocks.
  - `@media print` styling for standard A4 / slip paper.
- [x] Integrated into main dashboard navigation under `Attendance (26-Day)`.
- [x] **Verification Gate:** Verified 26-day math for *Ramesh Kumar* (Base ₹26,000, 2 days absent = -₹2,000, 6 hrs OT = +₹600, night shift = +₹500 $\rightarrow$ Net: ₹25,100), verified words generator (*"Rupees Twenty Five Thousand One Hundred Only"*), and verified clean frontend production build.

### Phase 11: Analytics Dashboard & Reports
- [x] Executive Dashboard matching **Dashboard V14/V18** visual structure and layout.
- [x] Financial metrics: Total billed, payments received, outstanding balance due, gross outflows (purchases + operating utilities + worker payroll), and net cash flow.
- [x] Stock metrics: Total customer inward raw steel weight (kg), inward receipts count, company-wise current stock balances, and negative stock protection guarantee.
- [x] Production & quality metrics: Total finished machined pieces, scrap pieces, shop-floor defect rate (%), and pending approval queue.
- [x] Real-time recent workshop activity feeds: Recent customer invoices, dispatch Delivery Challans, and customer inward payments.
- [x] Built interactive `AnalyticsDashboard` component:
  - Top 4 Primary KPI cards: Realized Collection (₹), Outstanding Balance Due (₹), Gross Workshop Outflow (₹), and Inward Customer Stock (kg).
  - Outflow breakdown sub-cards: Carbide tooling purchases, TANGEDCO EB power bills / operating utilities, and 26-day worker payroll.
  - Shop floor production & quality card with progress bar, scrap rate %, and pending admin approval counter.
  - Interactive multi-tab activity ledger (Invoices, Challans, Payments) with quick links to respective managers.
  - One-click CSV report export buttons for Tax Invoices and Company Stock Ledgers.
- [x] Automated CSV Data Export Engine:
  - `GET /api/analytics/export/invoices-csv`: Itemized invoice history with customer name, GSTIN, taxable value, CGST, SGST, round off, balance due, and DC references.
  - `GET /api/analytics/export/stock-csv`: Customer raw material balances with negative stock protection status.
- [x] Integrated into main dashboard navigation under `Overview` and `Financial Reports`.
- [x] **Verification Gate:** Tested `GET /api/analytics/dashboard` returning live aggregated financial totals (₹31,860 billed, ₹31,860 collected, ₹55,550 total outflow), production totals (120 finished pcs, 2 scrap pcs, 1.6% scrap rate), stock balances (Calmet 1,250 kg), verified CSV downloads, and verified clean frontend production build with Vite PWA precache.

### Phase 12: PWA Installation Verification & Mobile Touch Optimization
- [x] Configured `vite-plugin-pwa` with `manifest.webmanifest`, standalone app display mode, and service worker runtime caching (`NetworkFirst` for `/api/` calls, precaching for all HTML/CSS/JS/PNG/SVG assets).
- [x] Generated high-resolution PWA icons:
  - `pwa-192x192.png` and `pwa-512x512.png` with maskable icon support.
  - `apple-touch-icon.png` (180x180) and `icon.svg` vector icon.
- [x] Built interactive `PwaInstallPrompt` component:
  - Hooks into browser `beforeinstallprompt` event for Android/Chrome/Edge 1-click home screen install.
  - Interactive iOS Safari bottom-sheet guide with 3-step visual instruction ("Share" $\rightarrow$ "Add to Home Screen").
  - Auto-detects standalone display mode to suppress banner when already installed.
  - Integrated across `LoginView`, `App` (Admin Portal), and `WorkerPortal`.
- [x] Mobile Touch & Ergonomics Optimizations:
  - Minimum touch targets ($\ge 44\text{px}$–$48\text{px}$) across inputs, buttons, and sliding drawer navigation pills.
  - Input auto-zoom prevention on iOS Safari (`text-base sm:text-xs` font sizing).
  - Quick-add piece increment buttons (`+10`, `+25`, `+50`, `+100`) for shop floor speed on mobile devices.
  - Numeric keyboard triggers (`inputMode="numeric"`, `inputMode="decimal"`).
  - Touch-momentum scrolling with `-webkit-overflow-scrolling: touch` and tap highlight suppression.
  - Rotating refresh indicator for checking admin approval status.
- [x] **Verification Gate:** Tested `GET /manifest.webmanifest` (HTTP 200), `GET /pwa-192x192.png` (HTTP 200, 1013 bytes), `GET /registerSW.js` (HTTP 200), verified production build (`PWA precache: 18 entries, 614 KiB`), verified local dev and network serving (`http://192.168.1.6:5173/`).
- [ ] *Hostinger VPS Deployment:* Intentionally deferred to run after client testing & verification as requested.

---

## 📝 Change Log & Session Notes
* **2026-10-30:** **UI Refinement — Clean Light Sidebar with Icon + Name & Button Palette Standardization:**
  - Redesigned the left sidebar from the icon-only black floating dock into an elegant, neat enterprise sidebar (`w-64 bg-white border-r border-slate-200`) displaying both the icon and menu name clearly for all 11 modules.
  - Removed black background from buttons and pills across the entire application:
    - Primary buttons (`+ Create DC`, `+ Add Company`, `Save`, `Submit Work`) updated to clean white with crisp slate borders (`border-slate-300`), black text (`text-slate-900 font-semibold`), and subtle hover feedback (`hover:bg-slate-50 hover:border-slate-400`).
    - Active pills updated to soft neutral slate (`bg-slate-100 border border-slate-300 text-slate-900 font-semibold shadow-2xs`).
    - Inactive pills updated to clean white with subtle borders (`bg-white border border-slate-200 text-slate-600 hover:text-slate-900`).
  - Standardized typography strictly to black for primary text (`text-slate-900`) and grey for secondary text/labels (`text-slate-500`, `text-slate-400`), completely eliminating solid black button fills.
  - Verified across desktop and mobile views with zero build errors.
* **2026-10-30:** **Phase 12 Completed & Verified (PWA & Mobile Touch Optimization):**
  - Generated PWA icon suite (`pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, `icon.svg`, `favicon.ico`).
  - Configured `vite-plugin-pwa` in `frontend/vite.config.ts` with auto-update, Workbox NetworkFirst caching, and standalone display.
  - Built `PwaInstallPrompt.tsx` with native Android/Chrome prompt hook and iOS Safari Add-to-Home-Screen guide.
  - Optimized `WorkerPortal.tsx` and `LoginView.tsx` with 48px touch targets, numeric keypad modes, iOS zoom prevention, quick-add quantity pills, and active touch transforms.
  - Verified PWA assets served over network (`http://192.168.1.6:5173/`). Hostinger VPS deployment deferred to subsequent phase after full testing.
* **2026-10-30:** **Phase 11 Completed & Verified:**
  - Implemented comprehensive Executive Dashboard API (`GET /api/analytics/dashboard`) aggregating live financial metrics, gross workshop outflows, net cash flow, shop-floor production counts, scrap rates, customer raw steel balances, and recent workshop activity streams.
  - Implemented CSV Report Export Endpoints (`GET /api/analytics/export/invoices-csv` and `GET /api/analytics/export/stock-csv`) for automated tabular accounting downloads.
  - Built interactive `AnalyticsDashboard` component styled according to **Dashboard V14/V18** design specifications (pure white background, deep slate accents, zero purple/saturated colors, regular/medium/semibold weights).
  - Wired real-time analytics to the default `Overview` and `Financial Reports` tabs in `frontend/src/App.tsx`, eliminating all static mock data.
  - Verified API responses, CSV downloads, and production Vite build with PWA service worker precache.
* **2026-10-30:** **Phase 10 Completed & Verified:**
  - Implemented Standard 26-Day Attendance API (`POST /api/salary/attendance`, `GET /api/salary/attendance`) with absence deduction logic.
  - Implemented Overtime (OT) Engine and Extra Shifts Engine with admin approval gates.
  - Implemented 26-Day Salary Engine (`POST /api/salary/generate`) calculating base, absence deductions, approved OT, and shift allowances.
  - Built `SalaryManager` and printable `PayslipPrintView` replicating standard CNC workshop pay slips.
* **2026-10-30:** **Phase 9 Completed & Verified:**
  - Implemented Worker Daily Work logging API (`POST /api/worker/daily-work`) with finished pcs, scrap pcs, and shift hours.
  - Implemented Admin Approval Gate (`PUT /api/worker/daily-work/:id/approve` and `reject`) and scrap rate analytics.
  - Implemented Operator Roster & Profile Management (`GET /api/worker/profiles`, `POST /api/worker/profiles`).
  - Built `ProductionManager` component with instant approval queue and operator management.
* **2026-10-30:** **Phase 8 Completed & Verified:**
  - Implemented Customer Payments API (`POST /api/payments`) with automated invoice balance reduction (`UNPAID` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID`).
  - Implemented Workshop Purchases API (`POST /api/expenses/purchases`) and Operating Utilities API (`POST /api/expenses/operating`).
  - Built `PaymentManager` and `ExpenseManager` components.
* **2026-10-30:** **Phase 7 Completed & Verified:**
  - Implemented Continuous FY-based Invoice numbering (`XXX/YYYY-YY`, e.g. `069/2026-27`).
  - Implemented Multi-Month DC consolidation with SAC `998898` (18% GST).
  - Implemented Indian Number-to-Words generator for currency.
  - Built `InvoiceManager` and millimeter-accurate A4 `InvoicePrintView`.
* **2026-10-30:** **Phase 6 Completed & Verified:**
  - Implemented continuous sequential DC auto-numbering engine (`GET /api/dcs/next-number`, starting from integer 1 or next sequence from 368).
  - Implemented Delivery Challan CRUD API (`POST /api/dcs`, `GET /api/dcs`, `GET /api/dcs/:id`, `PUT /api/dcs/:id/cancel`).
  - Added multi-line item dispatching and automatic `RETURNED_FINISHED` entry in the company stock ledger.
  - Added safety lock: DCs marked `INVOICED` cannot be cancelled or deleted without authorized invoice reversal.
  - Built interactive `DeliveryChallanManager` component with KPI counters, status filtering, and dynamic multi-part creation modal.
  - Built pixel-perfect `DCPrintView` replicating the physical bill book format (`DC bill reference.jpeg`) with `@media print` A4 portrait styling, custom declaration, and two-party signature blocks.
  - Tested DC creation (DC `#368` for 360 pcs Bracket 428672), verified sequential increment (`#369`), and verified print preview.
* **2026-10-30:** **Phase 5 Completed & Verified:**
  - Implemented Raw Material Inward Receipts API (`POST /api/stock/receipts`, `GET /api/stock/receipts`) capturing customer Delivery Note numbers, vehicle numbers, material grade, and weights in kg.
  - Built automatic Company Stock Ledger updates with real-time running balance calculation.
  - Implemented Stock Movement & Issue API (`POST /api/stock/movement`) with strict **negative stock prevention** (attempting to issue more than available physical balance is blocked with HTTP 400).
  - Built interactive `StockManager` component with KPI metric cards, Customer Inward Slips table with search, and full chronological Company Stock Ledger view.
  - Tested receipt entry (1,250 kg raw steel for Calmet Engineering) and negative stock protection.
* **2026-10-30:** **Phase 4 Completed & Verified:**
  - Implemented full Company CRUD API endpoints with Zod schema validation and duplicate checks.
  - Implemented full Material / Component CRUD API endpoints with drawing numbers, rates, and default Job Work SAC `998898` / GST `18.0%`.
  - Added soft-deactivation protection preventing deletion of companies or parts that already have active transactions.
  - Added automatic Audit Logging for every company/part creation and update.
  - Built `CompanyManager` and `MaterialManager` interactive frontend interfaces with instant search, status pills, and slide-in modals.
  - Connected navigation pills directly to live managers.
* **2026-10-30:** **Phase 3 Completed & Verified:**
  - Implemented JWT authentication and session persistence (`localStorage` + `httpOnly` secure cookies).
  - Implemented Role-Based Access Control (`ADMIN` vs `WORKER`).
  - Created minimalist Login view with one-click Demo credentials (`Admin Demo` and `Worker Demo`).
  - Built dedicated mobile-first **Worker Production Portal** with daily piece logging, scrap tracking, shift hours, and real-time approval status view.
  - Workers are strictly restricted from seeing financial data, company rates, or invoices.
  - Endpoints live: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/worker/daily-work`, `GET /api/worker/daily-work`.
* **2026-10-30:** **Phase 2 Completed & Verified:**
  - Connected to local PostgreSQL 18 instance (port 5433, user `postgres`, password `root`).
  - Created `cnc_billing` database.
  - Defined all 19 Prisma models & enums matching the document specifications and job work requirements.
  - Pushed schema to database and generated `@prisma/client` (`v6.19.3`).
  - Seeded initial accounts:
    - Admin: `admin` (password: `admin123`)
    - Worker: `worker1` (password: `worker123`, linked to `WorkerProfile` `SVT-EMP-001`, monthly base ₹26,000 for 26 days)
    - Client Companies: `Calmet Engineering India Pvt Ltd` & `Unimech Industries Limited` (exact addresses & GSTINs from real bills)
    - Master Materials: `Bracket 428672`, `Bracket Assembly & Packing 428672-011`, `Pin Housing` (SAC 998898, GST 18%).
  - Added live `/api/stats` endpoint; frontend top bar now shows `DB Synced (2 Companies, 3 Parts)`.
  - Launched Prisma Studio at `http://localhost:5555`.
* **2026-10-30:** **Phase 1 Completed & Verified:**
  - Initialized decoupled structure: `frontend/` (Vite + React 18 + TypeScript + Tailwind CSS + Lucide Icons + Framer Motion + Vite PWA) and `backend/` (Node.js + Express + TypeScript + Prisma + CORS + Helmet).
  - Designed the primary UI layout strictly following the reference aesthetic (pure white canvas `#FFFFFF`, dark floating capsule dock on desktop, touch-friendly hamburger drawer on mobile, Poppins/Inter typography with max 600 SemiBold, and billing software black & slate grey palette).
  - Connected frontend to live backend health endpoint (`http://localhost:5000/api/health`).
  - Both servers running as background daemons and verified active:
    - **Frontend:** `http://localhost:5173/` (Mobile Network: `http://192.168.1.6:5173/`)
    - **Backend API:** `http://localhost:5000/api/health`
* **2026-10-29:** Requirements analyzed from `Billing_software.docx` and 3 reference bill images. Technology locked (React Vite PWA + Node.js Express TS + PostgreSQL Prisma). Complete documentation architecture initialized.

