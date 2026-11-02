# CNC Machining Billing & Material Management Software
### Client: Shri Varshini Technologies (Job Work & CNC Machining)

Welcome to the project documentation. This system is designed for managing raw material inventory, Delivery Challans (DC), multi-month consolidated GST tax invoices, workshop purchases, operating expenses, worker attendance (26-day basis), overtime, extra shifts, daily production tracking, and financial ledgers.

---

## 📑 Documentation Index

To keep context clean and modular, the project documentation is divided into specialized documents:

| File | Purpose | Status |
| :--- | :--- | :--- |
| **[`docs/01_ARCHITECTURE_AND_TECH_STACK.md`](file:///d:/project/billing_software/docs/01_ARCHITECTURE_AND_TECH_STACK.md)** | Full technology stack, deployment lifecycle, security model, and AI readiness | ✅ Approved |
| **[`docs/02_DATABASE_SCHEMA_AND_MODELS.md`](file:///d:/project/billing_software/docs/02_DATABASE_SCHEMA_AND_MODELS.md)** | Prisma data models, PostgreSQL relational schema, constraints, and audit trails | ✅ Drafted |
| **[`docs/03_BUSINESS_RULES_AND_CALCULATIONS.md`](file:///d:/project/billing_software/docs/03_BUSINESS_RULES_AND_CALCULATIONS.md)** | Math formulas (26-day salary, OT, GST, DC sequential locking, stock accounting) | ✅ Drafted |
| **[`docs/04_UI_UX_DESIGN_SYSTEM.md`](file:///d:/project/billing_software/docs/04_UI_UX_DESIGN_SYSTEM.md)** | UI design rules matching reference images: Pure white `#FFFFFF`, black & grey palette, typography, PWA | ✅ Approved |
| **[`docs/05_STEP_BY_STEP_ROADMAP_AND_TRACKER.md`](file:///d:/project/billing_software/docs/05_STEP_BY_STEP_ROADMAP_AND_TRACKER.md)** | **Live progress tracker**, step-by-step phases, checklist, and verification status | 🟡 Active |
| **[`docs/06_PRINT_AND_PDF_TEMPLATES.md`](file:///d:/project/billing_software/docs/06_PRINT_AND_PDF_TEMPLATES.md)** | Pixel-perfect A4 specifications for Delivery Challans and Tax Invoices (SAC 998898) | ✅ Drafted |

---

## 🚀 Development Quick Reference

* **Frontend Port:** `http://localhost:5173` (Vite + React PWA)
* **Backend API Port:** `http://localhost:5000` (Node.js Express + TypeScript)
* **Database Studio:** `npx prisma studio` (Opens at `http://localhost:5555`)
* **Environment Strategy:**
  1. **Phase 1 (Development):** Local PostgreSQL (`localhost:5432`)
  2. **Phase 2 (Client Demo):** Supabase PostgreSQL (Cloud Database via `.env`)
  3. **Phase 3 (Production):** Hostinger VPS (Nginx + PM2 + Docker/Postgres)

---

## 📌 Development Rule of Thumb
1. **Never skip steps:** Complete Step N with full verification before moving to Step N+1.
2. **Update docs continually:** Whenever a feature is added or client feedback alters logic, immediately update [`docs/05_STEP_BY_STEP_ROADMAP_AND_TRACKER.md`](file:///d:/project/billing_software/docs/05_STEP_BY_STEP_ROADMAP_AND_TRACKER.md).
3. **Verify UI URLs:** Surface active `localhost` URLs at each step so the user can test live in their browser.

