require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');

const { initFirebase } = require('./utils/firebase');
const routes = require('./routes');
const { checkMissedCheckpoints } = require('./services/alertService');

// Initialize Firebase Admin before anything else
initFirebase();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Cron Jobs ─────────────────────────────────────────────────────────────────
// Runs every minute between 6am and 10pm WAT
cron.schedule('* 6-22 * * *', async () => {
  try {
    await checkMissedCheckpoints();
  } catch (err) {
    console.error('[Cron] checkMissedCheckpoints failed:', err.message);
  }
}, {
  timezone: 'Africa/Lagos',
});

console.log('[Cron] Alert checker scheduled (every minute, 06:00–22:00 WAT)');

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] SafeRoute backend running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;