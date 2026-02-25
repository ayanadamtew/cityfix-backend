const express = require('express');
const router = express.Router();

const {
    getAdminIssues,
    updateIssueStatus,
    getAdminAnalytics,
} = require('../controllers/adminController');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');

const ADMIN_ROLES = ['SECTOR_ADMIN', 'SUPER_ADMIN'];

// GET /api/admin/issues
router.get('/issues', requireAuth, requireRole(ADMIN_ROLES), getAdminIssues);

// PUT /api/admin/issues/:id/status
router.put(
    '/issues/:id/status',
    requireAuth,
    requireRole(ADMIN_ROLES),
    updateIssueStatus
);

// GET /api/admin/analytics – Super Admin only
router.get(
    '/analytics',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    getAdminAnalytics
);

module.exports = router;
