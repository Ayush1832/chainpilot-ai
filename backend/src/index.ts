// ============================================================
// ChainPilot AI — Express Server Entry Point
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ── Security Middleware ──
app.use(helmet());

// ── CORS Configuration ──
const corsOptions: cors.CorsOptions = {
  origin: [
    'http://localhost:3000',           // Next.js dev server
    'http://localhost:3001',           // Alternate dev port
    process.env.FRONTEND_URL || '',    // Production frontend
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address'],
};
app.use(cors(corsOptions));

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ──
app.use('/api', apiLimiter);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ChainPilot AI Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ──
import chatRouter from './routes/chat';
import walletRouter from './routes/wallet';
import transactionRouter from './routes/transaction';
import tokenRouter from './routes/token';
import defiRouter from './routes/defi';

app.use('/api/chat', chatRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/transaction', transactionRouter);
app.use('/api/token', tokenRouter);
app.use('/api/defi', defiRouter);

// ── 404 Handler ──
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    },
  });
});

// ── Global Error Handler ──
app.use(errorHandler);

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║          🚀 ChainPilot AI Backend            ║
║──────────────────────────────────────────────║
║  Status:      Running                        ║
║  Port:        ${String(PORT).padEnd(33)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(33)}║
║  Health:      http://localhost:${PORT}/api/health  ║
╚══════════════════════════════════════════════╝
  `);
});

export default app;
