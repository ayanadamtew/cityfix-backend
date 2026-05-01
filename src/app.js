require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

const { connectDB } = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');
const adminRoutes = require('./routes/adminRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const subcategoryRoutes = require('./routes/subcategoryRoutes');
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

// ─── Swagger Documentation ──────────────────────────────────────────────────
let swaggerDocument;
try {
    swaggerDocument = JSON.parse(fs.readFileSync('./swagger.json', 'utf8'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
    console.log('[Swagger] swagger.json not found. Run `npm run swagger` first.');
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', authRoutes);          // /api/auth/register  /api/users/me
app.use('/api/issues', issueRoutes);  // /api/issues  /api/issues/:id  etc.
app.use('/api/admin', adminRoutes);          // /api/admin/issues  /api/admin/analytics  /api/admin/technicians
app.use('/api/technician', technicianRoutes); // /api/technician/tasks  /api/technician/stats
app.use('/api/subcategories', subcategoryRoutes); // /api/subcategories

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
