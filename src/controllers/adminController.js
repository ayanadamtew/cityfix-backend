const IssueReport = require('../models/IssueReport');
const { getAnalytics } = require('../services/analyticsService');

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
                : { assignedAdminId: req.user._id };

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
        const { status } = req.body;
        const allowed = ['In Progress', 'Resolved'];

        if (!allowed.includes(status)) {
            return res.status(422).json({
                message: `Invalid status. Allowed values: ${allowed.join(', ')}.`,
            });
        }

        const filter =
            req.user.role === 'SUPER_ADMIN'
                ? { _id: req.params.id }
                : { _id: req.params.id, assignedAdminId: req.user._id };

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

        res.json(issue);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/analytics
 * Super Admin only – aggregated dashboard statistics.
 */
const getAdminAnalytics = async (req, res, next) => {
    try {
        const stats = await getAnalytics();
        res.json(stats);
    } catch (err) {
        next(err);
    }
};

module.exports = { getAdminIssues, updateIssueStatus, getAdminAnalytics };
