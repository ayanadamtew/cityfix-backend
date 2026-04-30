const { Op } = require('sequelize');
const {
    User,
    IssueReport,
    Assignment,
    CompletionProof,
    StatusHistory,
} = require('../models');
const { admin } = require('../config/firebase');
const { getIo } = require('../services/socketService');
const {
    sendAssignmentNotification,
    sendCompletionNotification,
    sendStatusUpdateNotification,
} = require('../services/notificationService');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR ADMIN — Technician Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/technicians
 * Sector Admin registers a new technician in their own department.
 */
const createTechnician = async (req, res, next) => {
    try {
        const { fullName, email, password, phoneNumber, specialization } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'fullName, email, and password are required.' });
        }

        const department = req.user.department;
        if (!department) {
            return res.status(403).json({ message: 'Only Sector Admins with a department can register technicians.' });
        }

        // Check if user already exists
        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        // Create Firebase account
        const firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: fullName,
        });

        await admin.auth().setCustomUserClaims(firebaseUser.uid, { role: 'TECHNICIAN' });

        // Create user in PostgreSQL
        const technician = await User.create({
            firebaseUid: firebaseUser.uid,
            email,
            fullName,
            phoneNumber: phoneNumber || null,
            role: 'TECHNICIAN',
            department,
            specialization: specialization || null,
        });

        res.status(201).json({ message: 'Technician registered successfully.', technician });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/technicians
 * List technicians in the admin's department.
 */
const getTechnicians = async (req, res, next) => {
    try {
        const where = { role: 'TECHNICIAN' };

        // Sector admins see only their department's technicians
        if (req.user.role === 'SECTOR_ADMIN') {
            where.department = req.user.department;
        }

        const technicians = await User.findAll({
            where,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'fullName', 'email', 'phoneNumber', 'department', 'specialization', 'isDisabled', 'averageRating', 'ratingCount', 'createdAt'],
        });

        res.json(technicians);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/admin/technicians/:id
 * Edit a technician's profile.
 */
const updateTechnician = async (req, res, next) => {
    try {
        const technician = await User.findOne({
            where: {
                id: req.params.id,
                role: 'TECHNICIAN',
                department: req.user.department,
            },
        });

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found or not in your department.' });
        }

        const { fullName, phoneNumber, specialization } = req.body;

        await technician.update({
            ...(fullName && { fullName }),
            ...(phoneNumber !== undefined && { phoneNumber }),
            ...(specialization !== undefined && { specialization }),
        });

        res.json({ message: 'Technician updated.', technician });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/admin/technicians/:id/status
 * Activate or deactivate a technician account.
 */
const toggleTechnicianStatus = async (req, res, next) => {
    try {
        const { isDisabled } = req.body;

        if (typeof isDisabled !== 'boolean') {
            return res.status(400).json({ message: 'isDisabled must be a boolean.' });
        }

        const technician = await User.findOne({
            where: {
                id: req.params.id,
                role: 'TECHNICIAN',
                department: req.user.department,
            },
        });

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found or not in your department.' });
        }

        await technician.update({ isDisabled });
        await admin.auth().updateUser(technician.firebaseUid, { disabled: isDisabled });

        res.json({ message: `Technician ${isDisabled ? 'deactivated' : 'activated'}.`, technician });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR ADMIN — Assignment & Verification
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/issues/:id/assign
 * Assign a technician to an approved issue.
 */
const assignTechnician = async (req, res, next) => {
    try {
        const { technicianId, priority, deadline, notes } = req.body;

        if (!technicianId) {
            return res.status(400).json({ message: 'technicianId is required.' });
        }

        const issue = await IssueReport.findOne({
            where: {
                id: req.params.id,
                category: req.user.department,
            },
        });

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found or not in your department.' });
        }

        if (!['Pending', 'Approved'].includes(issue.status)) {
            return res.status(400).json({ message: 'Issue must be Pending or Approved before assigning a technician.' });
        }

        // Verify the technician belongs to the same department
        const technician = await User.findOne({
            where: {
                id: technicianId,
                role: 'TECHNICIAN',
                department: req.user.department,
                isDisabled: false,
            },
        });

        if (!technician) {
            return res.status(400).json({ message: 'Invalid technician or technician is not in your department.' });
        }

        // Check for existing assignment
        const existingAssignment = await Assignment.findOne({ where: { issueId: issue.id } });
        if (existingAssignment) {
            return res.status(400).json({ message: 'This issue already has an assignment.' });
        }

        // Create assignment
        const assignment = await Assignment.create({
            issueId: issue.id,
            technicianId,
            assignedById: req.user.id,
            priority: priority || 'Medium',
            deadline: deadline || null,
            notes: notes || null,
        });

        // Update issue status
        const fromStatus = issue.status;
        await issue.update({ status: 'Assigned' });

        // Record status change
        await StatusHistory.create({
            issueId: issue.id,
            fromStatus,
            toStatus: 'Assigned',
            changedById: req.user.id,
            notes: `Assigned to ${technician.fullName}`,
        });

        // Notify technician
        sendAssignmentNotification(assignment, issue, technician).catch(() => {});

        // Socket event
        try {
            const io = getIo();
            io.emit('issue_status_changed', { issueId: issue.id, status: 'Assigned' });
            io.emit('technician_assigned', { issueId: issue.id, technicianId, assignmentId: assignment.id });
        } catch (err) {
            console.error('[Socket.io] Failed to emit assignment events', err);
        }

        // Reload with associations
        const populated = await Assignment.findByPk(assignment.id, {
            include: [
                { model: User, as: 'technician', attributes: ['id', 'fullName', 'email', 'phoneNumber', 'specialization'] },
                { model: User, as: 'assignedBy', attributes: ['id', 'fullName'] },
                { model: IssueReport, as: 'issue' },
            ],
        });

        res.status(201).json({ message: 'Technician assigned.', assignment: populated });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/verification
 * List issues awaiting verification in the admin's department.
 */
const getVerificationQueue = async (req, res, next) => {
    try {
        const where = { status: 'Waiting Verification' };

        if (req.user.role === 'SECTOR_ADMIN') {
            where.category = req.user.department;
        }

        const issues = await IssueReport.findAll({
            where,
            order: [['updatedAt', 'DESC']],
            include: [
                { model: User, as: 'citizen', attributes: ['id', 'fullName', 'email'] },
                {
                    model: Assignment,
                    as: 'assignment',
                    include: [
                        { model: User, as: 'technician', attributes: ['id', 'fullName', 'phoneNumber', 'specialization'] },
                        {
                            model: CompletionProof,
                            as: 'proofs',
                            order: [['submittedAt', 'DESC']],
                            limit: 1,
                        },
                    ],
                },
            ],
        });

        res.json(issues);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/verification/:proofId/approve
 * Approve a completion proof → issue becomes Resolved.
 */
const approveProof = async (req, res, next) => {
    try {
        const proof = await CompletionProof.findByPk(req.params.proofId, {
            include: [
                {
                    model: Assignment,
                    as: 'assignment',
                    include: [
                        { model: IssueReport, as: 'issue' },
                        { model: User, as: 'technician', attributes: ['id', 'fullName', 'fcmToken'] },
                    ],
                },
            ],
        });

        if (!proof) {
            return res.status(404).json({ message: 'Completion proof not found.' });
        }

        const issue = proof.assignment.issue;

        // Verify department access
        if (req.user.role === 'SECTOR_ADMIN' && issue.category !== req.user.department) {
            return res.status(403).json({ message: 'Not authorized to verify this issue.' });
        }

        // Update proof
        await proof.update({
            verificationStatus: 'Approved',
            verifiedAt: new Date(),
            verifiedById: req.user.id,
        });

        // Update assignment status
        await proof.assignment.update({ status: 'Resolved' });

        // Update issue status
        const fromStatus = issue.status;
        await issue.update({ status: 'Resolved' });

        // Record status change
        await StatusHistory.create({
            issueId: issue.id,
            fromStatus,
            toStatus: 'Resolved',
            changedById: req.user.id,
            notes: 'Proof approved by admin',
        });

        // Notify citizen
        sendStatusUpdateNotification(issue, 'Resolved').catch(() => {});

        try {
            const io = getIo();
            io.emit('issue_status_changed', { issueId: issue.id, status: 'Resolved' });
        } catch (err) {
            console.error('[Socket.io] Failed to emit status change', err);
        }

        res.json({ message: 'Proof approved. Issue resolved.', proof });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/verification/:proofId/reject
 * Reject a completion proof → issue goes back to Rejected for rework.
 */
const rejectProof = async (req, res, next) => {
    try {
        const { reason } = req.body;

        const proof = await CompletionProof.findByPk(req.params.proofId, {
            include: [
                {
                    model: Assignment,
                    as: 'assignment',
                    include: [
                        { model: IssueReport, as: 'issue' },
                        { model: User, as: 'technician', attributes: ['id', 'fullName', 'fcmToken'] },
                    ],
                },
            ],
        });

        if (!proof) {
            return res.status(404).json({ message: 'Completion proof not found.' });
        }

        const issue = proof.assignment.issue;

        if (req.user.role === 'SECTOR_ADMIN' && issue.category !== req.user.department) {
            return res.status(403).json({ message: 'Not authorized to verify this issue.' });
        }

        // Update proof
        await proof.update({
            verificationStatus: 'Rejected',
            verifiedAt: new Date(),
            verifiedById: req.user.id,
            rejectionReason: reason || 'Proof rejected by admin.',
        });

        // Update assignment status
        await proof.assignment.update({ status: 'Rejected' });

        // Update issue status
        const fromStatus = issue.status;
        await issue.update({ status: 'Rejected' });

        await StatusHistory.create({
            issueId: issue.id,
            fromStatus,
            toStatus: 'Rejected',
            changedById: req.user.id,
            notes: reason || 'Proof rejected',
        });

        try {
            const io = getIo();
            io.emit('issue_status_changed', { issueId: issue.id, status: 'Rejected' });
        } catch (err) {
            console.error('[Socket.io] Failed to emit status change', err);
        }

        res.json({ message: 'Proof rejected. Sent back for rework.', proof });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICIAN — Task Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/technician/tasks
 * Get all tasks assigned to the logged-in technician.
 */
const getTechnicianTasks = async (req, res, next) => {
    try {
        const assignments = await Assignment.findAll({
            where: { technicianId: req.user.id },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: IssueReport,
                    as: 'issue',
                    include: [
                        { model: User, as: 'citizen', attributes: ['id', 'fullName'] },
                    ],
                },
                { model: User, as: 'assignedBy', attributes: ['id', 'fullName'] },
            ],
        });

        res.json(assignments);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/technician/tasks/:assignmentId
 * Get a single assignment with full details.
 */
const getTechnicianTaskDetail = async (req, res, next) => {
    try {
        const assignment = await Assignment.findOne({
            where: {
                id: req.params.assignmentId,
                technicianId: req.user.id,
            },
            include: [
                {
                    model: IssueReport,
                    as: 'issue',
                    include: [
                        { model: User, as: 'citizen', attributes: ['id', 'fullName', 'phoneNumber'] },
                    ],
                },
                { model: User, as: 'assignedBy', attributes: ['id', 'fullName'] },
                {
                    model: CompletionProof,
                    as: 'proofs',
                    order: [['submittedAt', 'DESC']],
                },
            ],
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        res.json(assignment);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/technician/tasks/:assignmentId/status
 * Technician marks task as "In Progress".
 */
const updateTaskStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        // Technicians can only set "In Progress"
        if (status !== 'In Progress') {
            return res.status(400).json({ message: 'Technicians can only set status to "In Progress".' });
        }

        const assignment = await Assignment.findOne({
            where: {
                id: req.params.assignmentId,
                technicianId: req.user.id,
            },
            include: [{ model: IssueReport, as: 'issue' }],
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        // Only allow transition from Assigned or Rejected
        if (!['Assigned', 'Rejected'].includes(assignment.status)) {
            return res.status(400).json({ message: `Cannot start work on a task with status "${assignment.status}".` });
        }

        const fromStatus = assignment.issue.status;
        await assignment.update({ status: 'In Progress' });
        await assignment.issue.update({ status: 'In Progress' });

        await StatusHistory.create({
            issueId: assignment.issue.id,
            fromStatus,
            toStatus: 'In Progress',
            changedById: req.user.id,
            notes: 'Technician started work',
        });

        try {
            const io = getIo();
            io.emit('issue_status_changed', { issueId: assignment.issue.id, status: 'In Progress' });
        } catch (err) {
            console.error('[Socket.io] Failed to emit status change', err);
        }

        res.json({ message: 'Task marked as In Progress.', assignment });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/technician/tasks/:assignmentId/proof
 * Submit completion proof.
 */
const submitProof = async (req, res, next) => {
    try {
        const { afterPhotoUrl, beforePhotoUrl, notes } = req.body;

        if (!afterPhotoUrl) {
            return res.status(400).json({ message: 'afterPhotoUrl is required.' });
        }

        const assignment = await Assignment.findOne({
            where: {
                id: req.params.assignmentId,
                technicianId: req.user.id,
            },
            include: [{ model: IssueReport, as: 'issue' }],
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        if (assignment.status !== 'In Progress') {
            return res.status(400).json({ message: 'Task must be "In Progress" to submit proof.' });
        }

        // Create proof record
        const proof = await CompletionProof.create({
            assignmentId: assignment.id,
            technicianId: req.user.id,
            afterPhotoUrl,
            beforePhotoUrl: beforePhotoUrl || null,
            notes: notes || null,
        });

        // Update statuses
        const fromStatus = assignment.issue.status;
        await assignment.update({ status: 'Waiting Verification' });
        await assignment.issue.update({ status: 'Waiting Verification' });

        await StatusHistory.create({
            issueId: assignment.issue.id,
            fromStatus,
            toStatus: 'Waiting Verification',
            changedById: req.user.id,
            notes: 'Technician submitted completion proof',
        });

        // Notify admin
        sendCompletionNotification(assignment, proof).catch(() => {});

        try {
            const io = getIo();
            io.emit('issue_status_changed', { issueId: assignment.issue.id, status: 'Waiting Verification' });
            io.emit('proof_submitted', { assignmentId: assignment.id, proofId: proof.id });
        } catch (err) {
            console.error('[Socket.io] Failed to emit proof submission', err);
        }

        res.status(201).json({ message: 'Proof submitted. Awaiting admin verification.', proof });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/technician/stats
 * Dashboard statistics for the logged-in technician.
 */
const getTechnicianStats = async (req, res, next) => {
    try {
        const technicianId = req.user.id;

        const total = await Assignment.count({ where: { technicianId } });
        const assigned = await Assignment.count({ where: { technicianId, status: 'Assigned' } });
        const inProgress = await Assignment.count({ where: { technicianId, status: 'In Progress' } });
        const waitingVerification = await Assignment.count({ where: { technicianId, status: 'Waiting Verification' } });
        const resolved = await Assignment.count({ where: { technicianId, status: 'Resolved' } });
        const rejected = await Assignment.count({ where: { technicianId, status: 'Rejected' } });

        res.json({
            total,
            assigned,
            inProgress,
            waitingVerification,
            resolved,
            rejected,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    // Sector Admin
    createTechnician,
    getTechnicians,
    updateTechnician,
    toggleTechnicianStatus,
    assignTechnician,
    getVerificationQueue,
    approveProof,
    rejectProof,
    // Technician
    getTechnicianTasks,
    getTechnicianTaskDetail,
    updateTaskStatus,
    submitProof,
    getTechnicianStats,
};
