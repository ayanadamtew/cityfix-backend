const IssueReport = require('../models/IssueReport');
const Comment = require('../models/Comment');
const ReportedPost = require('../models/ReportedPost');
const { findAdminByCategory } = require('../services/routingService');
const { toggleUrgencyVote } = require('../services/voteService');

/**
 * GET /api/issues
 * Public feed. Supports ?sort=recent|urgent and ?kebele=<location>
 */
const getIssues = async (req, res, next) => {
    try {
        const { sort, kebele } = req.query;
        const filter = {};

        if (kebele) {
            filter['location.kebele'] = kebele;
        }

        const sortOption =
            sort === 'urgent' ? { urgencyCount: -1 } : { createdAt: -1 };

        const issues = await IssueReport.find(filter)
            .sort(sortOption)
            .populate('citizenId', 'fullName')
            .populate('assignedAdminId', 'fullName department');

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
            citizenId: req.user._id,
            assignedAdminId,
            category,
            description,
            photoUrl,
            location,
            // Offline sync: preserve original capture time if provided
            draftedAt: draftedAt ? new Date(draftedAt) : undefined,
        });

        res.status(201).json(issue);
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
        const issue = await IssueReport.findById(req.params.id)
            .populate('citizenId', 'fullName')
            .populate('assignedAdminId', 'fullName department');

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        const comments = await Comment.find({ issueId: issue._id })
            .sort({ createdAt: 1 })
            .populate('authorId', 'fullName role');

        res.json({ issue, comments });
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
        const citizenId = req.user._id;

        const issue = await IssueReport.findById(issueId);
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

        const issue = await IssueReport.findById(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        const comment = await Comment.create({
            issueId,
            authorId: req.user._id,
            text: req.body.text,
        });

        await comment.populate('authorId', 'fullName role');
        res.status(201).json(comment);
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

        const issue = await IssueReport.findById(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        const report = await ReportedPost.create({
            issueId,
            citizenId: req.user._id,
            reason: req.body.reason,
        });

        res.status(201).json({ message: 'Issue reported for review.', report });
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
};
