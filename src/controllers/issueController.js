const { Op } = require('sequelize');
const { IssueReport, Comment, ReportedPost, Feedback, User } = require('../models');
const { findAdminByCategory } = require('../services/routingService');
const { toggleUrgencyVote } = require('../services/voteService');
const { getIo } = require('../services/socketService');

/**
 * GET /api/issues
 * Public feed. Supports ?sort=recent|urgent and ?kebele=<location> and ?search=<text>
 */
const getIssues = async (req, res, next) => {
    try {
        const { sort, kebele, search } = req.query;
        const where = {};

        if (kebele) {
            where.kebele = kebele;
        }

        if (search) {
            where[Op.or] = [
                { description: { [Op.iLike]: `%${search}%` } },
                { category: { [Op.iLike]: `%${search}%` } },
                { kebele: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const order = sort === 'urgent'
            ? [['urgencyCount', 'DESC']]
            : [['createdAt', 'DESC']];

        const issues = await IssueReport.findAll({
            where,
            order,
            include: [
                { model: User, as: 'citizen', attributes: ['id', 'fullName'] },
                { model: User, as: 'assignedAdmin', attributes: ['id', 'fullName', 'department'] },
                { model: Comment, as: 'comments', attributes: [] }, // for count only
            ],
        });

        res.json(issues);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/issues
 * Citizen reports an issue. Auto-routes to matching SectorAdmin.
 */
const createIssue = async (req, res, next) => {
    try {
        const { category, description, photoUrl, location, draftedAt } = req.body;

        // Auto-routing
        const assignedAdminId = await findAdminByCategory(category);

        const issue = await IssueReport.create({
            citizenId: req.user.id,
            assignedAdminId: assignedAdminId || null,
            category,
            description,
            photoUrl: photoUrl || null,
            latitude: location?.latitude ?? null,
            longitude: location?.longitude ?? null,
            address: location?.address ?? null,
            kebele: location?.kebele ?? null,
            draftedAt: draftedAt ? new Date(draftedAt) : null,
        });

        // Populate citizen info before emitting
        const populated = await IssueReport.findByPk(issue.id, {
            include: [{ model: User, as: 'citizen', attributes: ['id', 'fullName'] }],
        });

        try {
            const io = getIo();
            io.emit('new_issue', populated);
        } catch (err) {
            console.error('[Socket.io] Failed to emit new_issue', err);
        }

        res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/issues/:id
 * Fetch a single issue with populated comments.
 */
const getIssueById = async (req, res, next) => {
    try {
        const issue = await IssueReport.findByPk(req.params.id, {
            include: [
                { model: User, as: 'citizen', attributes: ['id', 'fullName'] },
                { model: User, as: 'assignedAdmin', attributes: ['id', 'fullName', 'department'] },
            ],
        });

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        const comments = await Comment.findAll({
            where: { issueId: issue.id },
            order: [['createdAt', 'ASC']],
            include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'role', 'department'] }],
        });

        const feedback = await Feedback.findOne({ where: { issueId: issue.id } });

        res.json({ issue, comments, feedback });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/issues/:id/vote
 * Toggle urgency vote.
 */
const voteOnIssue = async (req, res, next) => {
    try {
        const issueId = req.params.id;
        const citizenId = req.user.id;

        const issue = await IssueReport.findByPk(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        const result = await toggleUrgencyVote(issueId, citizenId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/issues/:id/comments
 * Add a comment to an issue.
 */
const addComment = async (req, res, next) => {
    try {
        const issueId = req.params.id;

        const issue = await IssueReport.findByPk(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        const comment = await Comment.create({
            issueId,
            authorId: req.user.id,
            text: req.body.text,
        });

        // Increment live comment count
        await IssueReport.increment('commentCount', { where: { id: issueId } });

        const populated = await Comment.findByPk(comment.id, {
            include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'role', 'department'] }],
        });

        try {
            const io = getIo();
            io.to(`issue_${issueId}`).emit('new_comment', populated);
            io.emit('issue_comment_count_updated', {
                issueId,
                commentCount: issue.commentCount + 1,
            });
        } catch (err) {
            console.error('[Socket.io] Failed to emit new_comment', err);
        }

        res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/issues/:id/report
 * Flag an issue as inappropriate.
 */
const reportIssue = async (req, res, next) => {
    try {
        const issueId = req.params.id;

        const issue = await IssueReport.findByPk(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        const report = await ReportedPost.create({
            issueId,
            citizenId: req.user.id,
            reason: req.body.reason,
        });

        const populatedReport = await ReportedPost.findByPk(report.id, {
            include: [
                { model: User, as: 'reporter', attributes: ['id', 'fullName', 'email', 'role'] },
                {
                    model: IssueReport,
                    as: 'issue',
                    include: [{ model: User, as: 'citizen', attributes: ['id', 'fullName', 'email'] }],
                },
            ],
        });

        try {
            const io = getIo();
            io.emit('new_moderation_report', populatedReport);
        } catch (err) {
            console.error('[Socket.io] Failed to emit new_moderation_report', err);
        }

        res.status(201).json({ message: 'Issue reported for review.', report: populatedReport });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/issues/mine
 * Fetch the authenticated citizen's own issue reports.
 */
const getMyIssues = async (req, res, next) => {
    try {
        const issues = await IssueReport.findAll({
            where: { citizenId: req.user.id },
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'assignedAdmin', attributes: ['id', 'fullName', 'department'] },
            ],
        });

        res.json(issues);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/issues/:id/feedback
 * Citizen submits a star rating (1-5) after issue is Resolved.
 */
const submitFeedback = async (req, res, next) => {
    try {
        const issueId = req.params.id;
        const { rating, comment } = req.body;

        const issue = await IssueReport.findByPk(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        // Upsert: one feedback per citizen per issue
        const [feedback] = await Feedback.upsert(
            { issueId, citizenId: req.user.id, rating, comment: comment || '' },
            { returning: true }
        );

        res.status(201).json(feedback);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/issues/:id
 * Citizen edits their own pending issue report.
 */
const editIssue = async (req, res, next) => {
    try {
        const issueId = req.params.id;
        const { description, category, location } = req.body;

        const issue = await IssueReport.findByPk(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        // Verify ownership
        if (issue.citizenId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to edit this issue.' });
        }

        // Only allow edits if status is pending
        if (issue.status.toLowerCase() !== 'pending') {
            return res.status(400).json({ message: 'Cannot edit an issue that is already being processed.' });
        }

        await issue.update({
            description,
            category,
            latitude: location?.latitude ?? issue.latitude,
            longitude: location?.longitude ?? issue.longitude,
            address: location?.address ?? issue.address,
            kebele: location?.kebele ?? issue.kebele,
        });

        const updatedIssue = await IssueReport.findByPk(issueId, {
            include: [
                { model: User, as: 'citizen', attributes: ['id', 'fullName'] },
                { model: User, as: 'assignedAdmin', attributes: ['id', 'fullName', 'department'] },
            ],
        });

        res.json(updatedIssue);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getIssues,
    createIssue,
    getIssueById,
    voteOnIssue,
    addComment,
    reportIssue,
    getMyIssues,
    editIssue,
    submitFeedback,
};
