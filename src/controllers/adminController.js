const IssueReport = require('../models/IssueReport');
const User = require('../models/User'); // Added for admin creation
const { getAnalytics } = require('../services/analyticsService');
const { sendResolutionNotification } = require('../services/notificationService');
const { admin } = require('../config/firebase'); // Added for admin creation
const { getIo } = require('../services/socketService');

/**
 * GET /api/admin/issues
 * Sector Admin: fetch issues assigned to them.
 * Super Admin: fetch all issues.
 */
const getAdminIssues = async (req, res, next) => {
    try {
        const filter =
            req.user.role === 'SUPER_ADMIN'
                ? {}
                : { category: req.user.department };

        const issues = await IssueReport.find(filter)
            .sort({ createdAt: -1 })
            .populate('citizenId', 'fullName email phoneNumber')
            .populate('assignedAdminId', 'fullName department');

        res.json(issues);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/admin/issues/:id/status
 * Update issue status to 'In Progress' or 'Resolved'.
 * Sector Admin can only update issues assigned to them.
 */
const updateIssueStatus = async (req, res, next) => {
    try {
        if (req.user.role === 'SUPER_ADMIN') {
            return res.status(403).json({
                message: 'Forbidden: Super Admins can only view issues, not edit their status. Please leave this to the assigned Sector Admin.',
            });
        }

        const { status } = req.body;
        const allowed = ['Pending', 'In Progress', 'Resolved'];

        if (!allowed.includes(status)) {
            return res.status(422).json({
                message: `Invalid status. Allowed values: ${allowed.join(', ')}.`,
            });
        }

        const filter =
            req.user.role === 'SUPER_ADMIN'
                ? { _id: req.params.id }
                : { _id: req.params.id, category: req.user.department };

        const issue = await IssueReport.findOneAndUpdate(
            filter,
            { status },
            { returnDocument: 'after' }
        );

        if (!issue) {
            return res
                .status(404)
                .json({ message: 'Issue not found or not assigned to you.' });
        }

        // Fire push notification in background when issue is resolved
        if (status === 'Resolved') {
            sendResolutionNotification(issue).catch(() => {/* already logged inside */ });
        }

        try {
            const io = getIo();
            io.emit('issue_status_changed', {
                issueId: issue._id.toString(),
                status: issue.status
            });
        } catch (err) {
            console.error('[Socket.io] Failed to emit issue_status_changed', err);
        }

        res.json(issue);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/analytics
 * Fetch aggregated dashboard statistics.
 */
const getAdminAnalytics = async (req, res, next) => {
    try {
        const department = req.user.role === 'SUPER_ADMIN' ? null : req.user.department;
        const stats = await getAnalytics(department);
        res.json(stats);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/users
 * Super Admin only - creates a new Sector Admin.
 */
const createAdmin = async (req, res, next) => {
    try {
        const { fullName, email, password, department } = req.body;

        if (!fullName || !email || !password || !department) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const validDepartments = ['Water', 'Waste', 'Road', 'Electricity'];
        if (!validDepartments.includes(department)) {
            return res.status(400).json({ message: 'Invalid department.' });
        }

        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Create user in Firebase Auth
        const firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: fullName,
        });

        // Set custom claims (optional but good practice)
        await admin.auth().setCustomUserClaims(firebaseUser.uid, { role: 'SECTOR_ADMIN' });

        // Create user in MongoDB
        const user = await User.create({
            firebaseUid: firebaseUser.uid,
            email,
            fullName,
            role: 'SECTOR_ADMIN',
            department,
        });

        res.status(201).json({ message: 'Admin created successfully.', user });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/users
 * Super Admin only - fetches all users grouped by Admins and Citizens.
 */
const getSystemUsers = async (req, res, next) => {
    try {
        const admins = await User.find({ role: { $in: ['SECTOR_ADMIN', 'SUPER_ADMIN'] } }).sort({ createdAt: -1 });
        const citizens = await User.find({ role: 'CITIZEN' }).sort({ createdAt: -1 });

        res.json({ admins, citizens });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/admin/users/:id/status
 * Super Admin only - disables or enables a user.
 */
const toggleUserStatus = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { isDisabled } = req.body;

        if (typeof isDisabled !== 'boolean') {
            return res.status(400).json({ message: 'isDisabled must be a boolean.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cannot disable super admin.' });
        }

        // Update in DB
        user.isDisabled = isDisabled;
        await user.save();

        // Update in Firebase Auth
        await admin.auth().updateUser(user.firebaseUid, {
            disabled: isDisabled
        });

        res.json({ message: `User ${isDisabled ? 'disabled' : 'enabled'} successfully.`, user });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/moderation/reports
 * Super Admin only - fetches all reported posts for review.
 */
const getModerationReports = async (req, res, next) => {
    try {
        const ReportedPost = require('../models/ReportedPost');
        const reports = await ReportedPost.find()
            .sort({ createdAt: -1 })
            .populate('citizenId', 'fullName email role')
            .populate({
                path: 'issueId',
                populate: {
                    path: 'citizenId',
                    select: 'fullName email',
                },
            });
        res.json(reports);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/admin/moderation/reports/:id/dismiss
 * Super Admin only - dismisses a report without deleting the target issue.
 */
const dismissReport = async (req, res, next) => {
    try {
        const ReportedPost = require('../models/ReportedPost');
        const reportId = req.params.id;
        const report = await ReportedPost.findByIdAndDelete(reportId);

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }
        res.json({ message: 'Report dismissed.' });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/admin/moderation/reports/:id/issue
 * Super Admin only - deletes the target issue and cascades to comments, feedbacks, and reports.
 */
const deleteReportedIssue = async (req, res, next) => {
    try {
        const ReportedPost = require('../models/ReportedPost');
        const Comment = require('../models/Comment');
        const Feedback = require('../models/Feedback');
        const reportId = req.params.id;

        const report = await ReportedPost.findById(reportId);
        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const issueId = report.issueId;

        // Delete the issue itself
        await IssueReport.findByIdAndDelete(issueId);

        // Delete associated records to keep DB clean
        await Comment.deleteMany({ issueId });
        await Feedback.deleteMany({ issueId });
        await ReportedPost.deleteMany({ issueId });

        res.json({ message: 'Issue and associated data deleted.' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAdminIssues,
    updateIssueStatus,
    getAdminAnalytics,
    createAdmin,
    getSystemUsers,
    toggleUserStatus,
    getModerationReports,
    dismissReport,
    deleteReportedIssue
};
