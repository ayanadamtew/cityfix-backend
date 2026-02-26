const express = require('express');
const router = express.Router();

const {
    getAdminIssues,
    updateIssueStatus,
    getAdminAnalytics,
    createAdmin,
    getSystemUsers,
} = require('../controllers/adminController');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');

const ADMIN_ROLES = ['SECTOR_ADMIN', 'SUPER_ADMIN'];

// POST /api/admin/users
router.post('/users', requireAuth, requireRole(['SUPER_ADMIN']), createAdmin);

// GET /api/admin/users
router.get('/users', requireAuth, requireRole(['SUPER_ADMIN']), getSystemUsers);

// GET /api/admin/issues
router.get('/issues', requireAuth, requireRole(ADMIN_ROLES), getAdminIssues);

// PUT /api/admin/issues/:id/status
router.put(
    '/issues/:id/status',
    requireAuth,
    requireRole(ADMIN_ROLES),
    updateIssueStatus
);

// GET /api/admin/analytics
router.get(
    '/analytics',
    requireAuth,
    requireRole(ADMIN_ROLES),
    getAdminAnalytics
);

module.exports = router;
