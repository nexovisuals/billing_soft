import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './prisma.js';
import authRoutes from './routes/auth.routes.js';
import workerRoutes from './routes/worker.routes.js';
import companyRoutes from './routes/company.routes.js';
import materialRoutes from './routes/material.routes.js';
import stockRoutes from './routes/stock.routes.js';
import dcRoutes from './routes/dc.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import salaryRoutes from './routes/salary.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s: string) => s.trim())
  : ['http://localhost:5173'];

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/dcs', dcRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'CNC Machining Billing API is running smoothly',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    company: 'Shri Varshini Technologies'
  });
});

// Live Database Test & Summary Endpoint
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const [companiesCount, materialsCount, usersCount, recentCompanies] = await Promise.all([
      prisma.company.count(),
      prisma.material.count(),
      prisma.user.count(),
      prisma.company.findMany({ select: { id: true, name: true, gstin: true } })
    ]);

    res.status(200).json({
      database: 'connected',
      counts: {
        companies: companiesCount,
        materials: materialsCount,
        users: usersCount,
      },
      companies: recentCompanies
    });
  } catch (error: any) {
    res.status(500).json({
      database: 'error',
      message: error?.message || 'Database query failed'
    });
  }
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send('CNC Billing API Server v1.0.0');
});

// Start listening
app.listen(PORT, () => {
  console.log(`[BACKEND] Server listening on http://localhost:${PORT}`);
  console.log(`[BACKEND] Health check available at http://localhost:${PORT}/api/health`);
  console.log(`[BACKEND] Database test available at http://localhost:${PORT}/api/stats`);
});

