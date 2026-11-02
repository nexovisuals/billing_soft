# CNC Machining Billing & Material Management Software
### Client: Shri Varshini Technologies (Job Work & CNC Machining)

A production-ready workshop management, billing, material tracking, and workforce attendance PWA built for CNC machining job-work enterprises.

---

## 🚀 Live Cloud Deployment Guide (24/7 Access)

This project is fully decoupled into an Express + Prisma backend and a React + Vite frontend, ready to run 24/7 online even when your local machine is switched off.

### Step 1: Set up Free Cloud PostgreSQL Database
Choose any serverless or managed PostgreSQL provider:
- **[Neon](https://neon.tech)** (Recommended - Free Serverless Postgres)
- **[Supabase](https://supabase.com)** (Free Managed Postgres)
- **[Render Postgres](https://render.com)** (Free Cloud Database)

After creating your database project, copy the connection string URL:
```text
postgresql://user:password@host:port/database?sslmode=require
```

Push the database schema and initialize the root admin:
```bash
cd backend
# Set DATABASE_URL in backend/.env to your cloud connection string
npx prisma db push
npx tsx prisma/clear_all_data.ts
```

---

### Step 2: Deploy Backend (Render / Railway)
1. Go to **[Render Dashboard](https://dashboard.render.com/)** -> **New Web Service**.
2. Connect your GitHub repository: `nexovisuals/billing_soft`.
3. Set the following configuration:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
4. Add **Environment Variables**:
   - `DATABASE_URL`: *(Your cloud PostgreSQL connection string)*
   - `JWT_SECRET`: *(A secure random string)*
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `*`
5. Click **Deploy Web Service**. You will receive your backend public URL (e.g., `https://billing-backend.onrender.com`).

---

### Step 3: Deploy Frontend (Vercel / Netlify)
1. Go to **[Vercel Dashboard](https://vercel.com/)** -> **Add New Project**.
2. Select your GitHub repository: `nexovisuals/billing_soft`.
3. Set the following configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variables**:
   - `VITE_API_URL`: *(Your Render backend URL, e.g. `https://billing-backend.onrender.com`)*
5. Click **Deploy**. Vercel will give you a fast, production CDN link (e.g. `https://billing-soft.vercel.app`).

---

## 🔑 Initial Default Login

| Role | Username | Password | Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full control: Company creation, DC & Invoicing, Staff & Worker account creation, edit and delete permissions |

---

## 📑 Local Development

* **Frontend:** `cd frontend && npm install && npm run dev` (Runs on `http://localhost:5173`)
* **Backend:** `cd backend && npm install && npm run dev` (Runs on `http://localhost:5000`)
* **Database Studio:** `cd backend && npx prisma studio` (Runs on `http://localhost:5555`)
