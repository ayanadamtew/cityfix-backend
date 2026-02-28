require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middlewares/errorHandler');

// Init Firebase before anything else
initializeFirebase();

const app = express();

// ─── Global Middlewares ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    next();
});
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', authRoutes);          // /api/auth/register  /api/users/me
app.use('/api/issues', issueRoutes);  // /api/issues  /api/issues/:id  etc.
app.use('/api/admin', adminRoutes);   // /api/admin/issues  /api/admin/analytics

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'CityFix API' }));

// ─── 404 Fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── DB connection helper (called by server.js, NOT called here) ──────────────
const start = async () => {
    await connectDB();
};

module.exports = app;
module.exports.start = start;
