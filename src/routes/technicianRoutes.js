const express = require('express');
const router = express.Router();

const {
    getTechnicianTasks,
    getTechnicianTaskDetail,
    updateTaskStatus,
    submitProof,
    getTechnicianStats,
} = require('../controllers/technicianController');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');

// All routes require TECHNICIAN role
router.use(requireAuth, requireRole(['TECHNICIAN']));

// GET /api/technician/stats — dashboard statistics
router.get('/stats', getTechnicianStats);

// GET /api/technician/tasks — list all assigned tasks
router.get('/tasks', getTechnicianTasks);

// GET /api/technician/tasks/:assignmentId — single task detail
router.get('/tasks/:assignmentId', getTechnicianTaskDetail);

// PUT /api/technician/tasks/:assignmentId/status — start work
router.put('/tasks/:assignmentId/status', updateTaskStatus);

// POST /api/technician/tasks/:assignmentId/proof — submit completion proof
router.post('/tasks/:assignmentId/proof', submitProof);

module.exports = router;
