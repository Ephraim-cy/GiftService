require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { startExpiryJob } = require('./services/expiry');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const paymentRoutes = require('./routes/payments');
const templateRoutes = require('./routes/templates');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

const app = express();

// ── DATABASE ──
connectDB();

// ── SECURITY & MIDDLEWARE ──
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }); // 300 req / 15min per IP
app.use('/api', limiter);

// Stripe webhook needs the RAW body, so it must be mounted before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments', paymentRoutes);

// Everything else uses JSON body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── ROUTES ──
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Public recipient view route is inside analyticsRoutes at GET /view/:shareableId,
// but mount it at root level too so the link is clean: giftservice.com/view/xyz
app.use('/', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── START ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 GiftService backend running on port ${PORT}`);
  startExpiryJob();
});
