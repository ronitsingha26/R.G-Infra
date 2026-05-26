import 'dotenv/config';
import express from 'express';
import { readFileSync } from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import contactRoutes from './routes/contact.js';
import apartmentRoutes from './routes/apartments.js';
import flatRoutes from './routes/flats.js';
import demandLetterRoutes from './routes/demandLetters.js';
import communicationRoutes from './routes/communications.js';
import paymentStageRoutes from './routes/paymentStages.js';
import paymentScheduleRoutes from './routes/paymentSchedules.js';
import reminderRoutes from './routes/reminders.js';
import backupRoutes from './routes/backups.js';
import workProjectionRoutes from './routes/workProjection.js';
import { startDueReminderCron, stopDueReminderCron } from './services/dueReminderCron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ─── Environment ───────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5001;

// ─── CORS Origins ──────────────────────────────────────────────────────────
// In production: set ALLOWED_ORIGINS in Hostinger env vars (comma-separated)
// e.g. https://yourdomain.com,https://www.yourdomain.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:5001'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!isProd) return callback(null, true); // Allow all in dev
    console.warn(`⛔ CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS policy: origin ${origin} is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ─── Socket.IO ─────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: isProd ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: isProd,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible in routes via req.app
app.set('io', io);

// ─── Security & Performance Middleware ────────────────────────────────────
app.set('trust proxy', 1); // Required when behind Hostinger's reverse proxy

app.use(helmet({
  // Allow inline scripts/styles needed by React (CSP is too strict without nonces)
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(compression()); // gzip all responses
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle pre-flight for all routes

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Serve uploads directory for proof images ──────────────────────────────
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// ─── Rate Limiting — Brute-force protection on login ──────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/demand-letters', demandLetterRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/payment-stages', paymentStageRoutes);
app.use('/api/payment-schedules', paymentScheduleRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/work-projection', workProjectionRoutes);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() })
);

// ─── Serve Frontend Build (Production only) ────────────────────────────────
// In production, Express serves the Vite-built React app as static files.
// All non-API GET requests fall through to index.html for React Router to handle.
const frontendDist = join(__dirname, 'dist');

if (isProd && existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      maxAge: '7d',   // Cache assets for 7 days
      etag: true,
      index: false,   // Let us handle index.html manually for SPA fallback
    })
  );

  // SPA fallback — any non-API route returns index.html
  app.get('*', (req, res) => {
    // Don't catch /api/* — those are already handled above
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(join(frontendDist, 'index.html'));
  });
} else if (!isProd) {
  app.get('/', (_req, res) =>
    res.json({ message: '🚀 API running in dev mode. Frontend served by Vite on :5173.' })
  );
}

// ─── Socket.IO Event Handlers ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  socket.on('disconnect', (reason) =>
    console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`)
  );
});

// ─── Global Error Handler ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('❌ Unhandled error:', err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: isProd ? 'Internal server error.' : (err.message || 'Unknown error'),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────
// ─── Auto-migrate: create work_projections table if needed ────────────────
async function runMigrations() {
  try {
    const pool = (await import('./config/db.js')).default;
    const migrationPath = join(__dirname, 'migrations', 'work_projection_migration.sql');
    if (existsSync(migrationPath)) {
      const sql = readFileSync(migrationPath, 'utf-8');
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const statement of statements) {
        await pool.query(statement);
      }
      console.log('✅ Work projection migration applied');
    }
  } catch (err) {
    // Table already exists or other non-critical error
    if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
      console.warn('⚠️ Work projection migration note:', err.message);
    }
  }
}

httpServer.listen(PORT, async () => {
  console.log(`\n🚀 R.G INFRA API`);
  console.log(`   Port    : ${PORT}`);
  console.log(`   Mode    : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Origins : ${isProd ? allowedOrigins.join(', ') : '* (dev)'}`);
  console.log(`   Frontend: ${isProd && existsSync(frontendDist) ? frontendDist : 'served by Vite'}\n`);

  // Run database migrations
  await runMigrations();

  // Start automated due reminder cron job
  startDueReminderCron(io);
});

// ─── Graceful Shutdown (for PM2 / Hostinger) ──────────────────────────────
function shutdown(signal) {
  console.log(`\n🛑 ${signal} received. Closing HTTP server...`);
  stopDueReminderCron(); // Stop cron before shutdown
  httpServer.close(() => {
    console.log('✅ HTTP server closed. Exiting.');
    process.exit(0);
  });
  // Force exit after 10s if server doesn't close cleanly
  setTimeout(() => { console.error('⚠️ Force exit after timeout.'); process.exit(1); }, 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
