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

// --- MODERATION ---

// GET /api/admin/moderation/reports
router.get(
    '/moderation/reports',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    require('../controllers/adminController').getModerationReports
);

// DELETE /api/admin/moderation/reports/:id/dismiss
router.delete(
    '/moderation/reports/:id/dismiss',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    require('../controllers/adminController').dismissReport
);

// DELETE /api/admin/moderation/reports/:id/issue
router.delete(
    '/moderation/reports/:id/issue',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    require('../controllers/adminController').deleteReportedIssue
);

module.exports = router;
