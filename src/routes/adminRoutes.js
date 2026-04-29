const express = require('express');
const router = express.Router();

const {
    getAdminIssues,
    updateIssueStatus,
    getAdminAnalytics,
    createAdmin,
    getSystemUsers,
    toggleUserStatus,
} = require('../controllers/adminController');
const {
    createTechnician,
    getTechnicians,
    updateTechnician,
    toggleTechnicianStatus,
    assignTechnician,
    getVerificationQueue,
    approveProof,
    rejectProof,
} = require('../controllers/technicianController');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');

const ADMIN_ROLES = ['SECTOR_ADMIN', 'SUPER_ADMIN'];

// ─── User Management (Super Admin only) ─────────────────────────────────────
router.post('/users', requireAuth, requireRole(['SUPER_ADMIN']), createAdmin);
router.get('/users', requireAuth, requireRole(['SUPER_ADMIN']), getSystemUsers);
router.put('/users/:id/status', requireAuth, requireRole(['SUPER_ADMIN']), toggleUserStatus);

// ─── Issue Management ────────────────────────────────────────────────────────
router.get('/issues', requireAuth, requireRole(ADMIN_ROLES), getAdminIssues);
router.put('/issues/:id/status', requireAuth, requireRole(ADMIN_ROLES), updateIssueStatus);

// ─── Analytics ───────────────────────────────────────────────────────────────
router.get('/analytics', requireAuth, requireRole(ADMIN_ROLES), getAdminAnalytics);

// ─── Technician Management (Sector Admin only) ──────────────────────────────
router.post('/technicians', requireAuth, requireRole(['SECTOR_ADMIN']), createTechnician);
router.get('/technicians', requireAuth, requireRole(ADMIN_ROLES), getTechnicians);
router.put('/technicians/:id', requireAuth, requireRole(['SECTOR_ADMIN']), updateTechnician);
router.put('/technicians/:id/status', requireAuth, requireRole(['SECTOR_ADMIN']), toggleTechnicianStatus);

// ─── Technician Assignment ──────────────────────────────────────────────────
router.post('/issues/:id/assign', requireAuth, requireRole(['SECTOR_ADMIN']), assignTechnician);

// ─── Verification ───────────────────────────────────────────────────────────
router.get('/verification', requireAuth, requireRole(ADMIN_ROLES), getVerificationQueue);
router.post('/verification/:proofId/approve', requireAuth, requireRole(['SECTOR_ADMIN']), approveProof);
router.post('/verification/:proofId/reject', requireAuth, requireRole(['SECTOR_ADMIN']), rejectProof);

// ─── Moderation (Super Admin only) ──────────────────────────────────────────
router.get(
    '/moderation/reports',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    require('../controllers/adminController').getModerationReports
);

router.delete(
    '/moderation/reports/:id/dismiss',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    require('../controllers/adminController').dismissReport
);

router.delete(
    '/moderation/reports/:id/issue',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    require('../controllers/adminController').deleteReportedIssue
);

module.exports = router;
