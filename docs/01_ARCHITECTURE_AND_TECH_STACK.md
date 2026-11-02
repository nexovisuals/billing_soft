# Architecture & Technology Stack Specification

## 1. System Architecture Overview

The system uses a completely decoupled, modular client-server architecture:

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND CLIENT                      │
│ • React (Vite) + TypeScript                           │
│ • Progressive Web App (PWA) via Workbox               │
│ • Tailwind CSS + Lucide Icons                         │
│ • Framer Motion micro-interactions                    │
│ • Desktop: Floating Capsule Dock Nav                  │
│ • Mobile: Touch-optimized Hamburger Drawer            │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / JSON / JWT
                           ▼
┌────────────────────────────────────────────────────────┐
│                    BACKEND API                         │
│ • Node.js + Express (TypeScript)                       │
│ • Prisma ORM (Type-safe DB Client)                     │
│ • Zod Schema Validation                                │
│ • Role-Based Access Control (Admin vs Worker)          │
│ • Helmet + CORS + Rate Limiter                         │
│ • Native PDF Generator (Puppeteer / HTML-PDF)          │
└──────────────────────────┬─────────────────────────────┘
                           │ Connection String (DATABASE_URL)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                       │
│ • PostgreSQL Database                                  │
│ • Portability:                                         │
│   - Local Dev: localhost:5432                          │
│   - Client Demo: Supabase Cloud Database               │
│   - Production: Hostinger VPS Native / Docker Postgres │
└────────────────────────────────────────────────────────┘
```

---

## 2. Technology Choices & Justification

### 2.1 Frontend
* **Core:** React 18 / 19 with Vite + TypeScript.
* **Why Vite?** Instant Cold-Start (<300ms HMR), lightweight bundle size, effortless PWA plugin integration.
* **PWA Engine:** `vite-plugin-pwa` with custom `manifest.json` and Workbox service worker caching for offline resilience and native app installation on mobile (Android/iOS) and desktop (Windows/Mac).
* **Styling:** Tailwind CSS tailored for pure white background (`#FFFFFF`), neutral slate greys, and deep slate black (`#0F172A`).
* **Icons:** `lucide-react` for clean, consistent, professional outline icons.
* **Typography:** `Poppins` / `Inter` restricted to weights 400 (Regular), 500 (Medium), and 600 (SemiBold). **Strictly no heavy/extra-bold fonts.**
* **Animations:** `framer-motion` restricted to subtle, snappy transitions (150ms–200ms duration with cubic-bezier easing).

### 2.2 Backend
* **Runtime & Framework:** Node.js + Express with TypeScript.
* **Why Node.js over Python?**
  * **End-to-End Type Safety:** Types are shared between frontend and backend.
  * **Unified "Vibe Coding":** No syntax switching between Python and JavaScript when prompting AI models.
  * **First-Class AI Ecosystem:** Official SDKs for Google Gemini (`@google/genai`) and Anthropic Claude (`@anthropic-ai/sdk`) are built for TypeScript with full streaming support.
  * **Low Footprint:** Runs comfortably in ~150MB RAM on a modest Hostinger VPS.
* **Validation:** `zod` for request payload validation on all endpoints.
* **Security:** `helmet` for HTTP headers, `cors` configured with whitelist, `bcryptjs` / `argon2` for password hashing, and signed JWT cookies (`httpOnly`, `SameSite=Strict`, `secure`).

### 2.3 Database & ORM
* **Database Engine:** PostgreSQL (versions 14+).
* **ORM:** **Prisma ORM**.
  * Auto-generates type-safe database queries.
  * Migrations are fully automated via `prisma migrate`.
  * Visual database inspection tool included: `npx prisma studio`.
  * **Zero-Code Database Switching:**
    * Local: `DATABASE_URL="postgresql://user:pass@localhost:5432/cnc_billing"`
    * Supabase: `DATABASE_URL="postgresql://postgres:pass@db.supabase.co:5432/postgres"`
    * Hostinger VPS: `DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/cnc_billing"`

---

## 3. Deployment Lifecycle

### Phase 1: Local Development
* Both Frontend (`5173`) and Backend (`5000`) run on the developer machine.
* PostgreSQL runs locally on port `5432`.

### Phase 2: Client Demo
* Backend connects to **Supabase PostgreSQL** via `.env`.
* Frontend preview is served via local network IP or ngrok/Vercel tunnel so the client can test on real smartphones and tablets.

### Phase 3: Production Deployment on Hostinger VPS
* **Single All-in-One VPS Configuration:**
  * **Operating System:** Ubuntu 22.04 / 24.04 LTS.
  * **Web Server:** Nginx acting as Reverse Proxy and SSL termination (Free Let's Encrypt SSL via Certbot).
  * **Process Management:** `PM2` running the compiled Node.js backend.
  * **Database:** Native PostgreSQL running on the VPS or Dockerized Postgres container.
  * **Frontend:** Built into static assets (`npm run build`) and served lightning-fast via Nginx static file caching.
* **Backup Strategy:** Automated daily PostgreSQL dump (`pg_dump`) cron job saved to a secure secondary backup folder or cloud storage.

---

## 4. Future AI & Automation Readiness

The backend architecture is structured to support AI tools without architectural rewrites:
1. **AI Chatbot & Assistant:** Add an `/api/ai/chat` endpoint using the Google Gemini / Claude SDK with Server-Sent Events (SSE) for word-by-word streaming responses.
2. **AI Document & Invoice OCR:** Add an `/api/ai/ocr-dc` endpoint to extract customer DC numbers, part quantities, and drawing numbers from scanned paper slips.
3. **Automated WhatsApp / Email Alerts:** Add background worker queue (BullMQ or node-cron) to trigger daily dispatch summaries to admins.

