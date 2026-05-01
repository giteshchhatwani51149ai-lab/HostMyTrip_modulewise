import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
import './models/index'; // Setup all associations

import authRoutes from './routes/authRoutes';
import hotelRoutes from './routes/hotelRoutes';
import bookingRoutes from './routes/bookingRoutes';
import reviewRoutes from './routes/reviewRoutes';
import bookmarkRoutes from './routes/bookmarkRoutes';
import settingRoutes from './routes/settingRoutes';
import corporateRoutes from './routes/corporateRoutes';
import searchRoutes from './routes/searchRoutes';
import newsletterRoutes from './routes/newsletterRoutes';
import flightRoutes from './routes/flightRoutes';
import paymentRoutes from './routes/paymentRoutes';
import hotelAffiliateRoutes from './routes/hotelAffiliateRoutes';
import adminStatsRoutes from './routes/adminStatsRoutes';
import adminBookingsRoutes from './routes/adminBookingsRoutes';
import adminAuditRoutes from './routes/adminAuditRoutes';
import passport from './config/passport';
import { ensureBookingColumns } from './utils/ensureBookingColumns';
import { ensureAuditLogTable } from './utils/ensureAuditLogTable';
import { ensureCorporateColumns } from './utils/ensureCorporateColumns';
import { ensureAdminUser } from './utils/ensureAdminUser';
import webhookRoutes from './routes/webhookRoutes';
import cronRoutes from './routes/cronRoutes';
import { startEmailScheduler } from './services/emailScheduler';
import {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  paymentLimiter,
  searchLimiter,
  webhookLimiter,
  rateLimitLogger,
} from './middleware/rateLimiter';

dotenv.config();

const app = express();

// IMPORTANT: trust proxy so req.ip is the real client IP behind a load-balancer
// (Render, Vercel, Cloudflare, etc.). Required for rate-limiter accuracy.
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// ── Rate limiting ───────────────────────────────────────────────────────────
//  Order matters: log first, then global cap, then specific limiters per route.
app.use(rateLimitLogger);
app.use(globalLimiter);

// Granular per-route limiters (mounted *before* the matching router)
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth/verify-email', passwordResetLimiter);
app.use('/api/auth', authLimiter);

app.use('/api/payments', paymentLimiter);
app.use('/api/bookings', paymentLimiter);

app.use('/api/search', searchLimiter);
app.use('/api/hotels', searchLimiter);
app.use('/api/flights', searchLimiter);

app.use('/api/webhooks', webhookLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelAffiliateRoutes);   // affiliate-search first
app.use('/api/hotels', hotelRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/corporates', corporateRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminStatsRoutes);
app.use('/api/admin', adminBookingsRoutes);
app.use('/api/admin', adminAuditRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/cron', cronRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🔄 Attempting to connect to database...');
    console.log('📍 Database dialect:', sequelize.getDialect());

    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // Use sync() to create tables if they don't exist (PostgreSQL)
    // Skip the MSSQL-specific ensure functions for now
    const isProduction = process.env.NODE_ENV === 'production';
    const dialect = sequelize.getDialect();

    if (dialect === 'postgres') {
      console.log('🔄 Running Sequelize sync for PostgreSQL...');
      await sequelize.sync({ alter: false }); // Create tables if they don't exist
      console.log('✅ PostgreSQL tables synced.');
    } else {
      console.log('✅ Skipping sync — using MSSQL seed script approach.');
      await ensureBookingColumns();
      await ensureAuditLogTable();
      await ensureCorporateColumns();
    }

    // Automatically create admin user if env vars are provided
    await ensureAdminUser();

    startEmailScheduler();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${dialect}`);
    });
  } catch (error) {
    console.error('❌ Fatal error during server startup:');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Full error:', error);
    process.exit(1);
  }
};

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise);
  console.error('🚨 Reason:', reason);
  process.exit(1);
});

startServer();