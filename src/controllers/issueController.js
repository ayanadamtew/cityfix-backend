const IssueReport = require('../models/IssueReport');
const Comment = require('../models/Comment');
const ReportedPost = require('../models/ReportedPost');
const Feedback = require('../models/Feedback');
const { findAdminByCategory } = require('../services/routingService');
const { toggleUrgencyVote } = require('../services/voteService');
const { getIo } = require('../services/socketService');

/**
 * GET /api/issues
 * Public feed. Supports ?sort=recent|urgent and ?kebele=<location>
 */
const getIssues = async (req, res, next) => {
    try {
        const { sort, kebele, search } = req.query;
        const filter = {};

        if (kebele) {
            filter['location.kebele'] = kebele;
        }

        if (search) {
            filter.$or = [
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { 'location.kebele': { $regex: search, $options: 'i' } }
            ];
        }

        const sortOption =
            sort === 'urgent' ? { urgencyCount: -1 } : { createdAt: -1 };

        const issues = await IssueReport.aggregate([
            { $match: filter },
            { $sort: sortOption },
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'issueId',
                    as: '_comments',
                },
            },
            { $addFields: { commentCount: { $size: '$_comments' } } },
            { $project: { _comments: 0 } },
        ]);

        // Populate citizenId and assignedAdminId manually after aggregation
        await IssueReport.populate(issues, [
            { path: 'citizenId', select: 'fullName' },
            { path: 'assignedAdminId', select: 'fullName department' },
        ]);

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

        // Populate basic info before emitting to feed
        await issue.populate('citizenId', 'fullName');

        try {
            const io = getIo();
            io.emit('new_issue', issue);
        } catch (err) {
            console.error('[Socket.io] Failed to emit new_issue', err);
        }

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
            .populate('authorId', 'fullName role department');

        const feedback = await Feedback.findOne({ issueId: issue._id });

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

        // Keep a live comment count on the issue document
        await IssueReport.findByIdAndUpdate(issueId, { $inc: { commentCount: 1 } });

        await comment.populate('authorId', 'fullName role department');

        try {
            const io = getIo();
            io.to(`issue_${issueId}`).emit('new_comment', comment);
            io.emit('issue_comment_count_updated', {
                issueId: issueId,
                commentCount: issue.commentCount + 1
            });
        } catch (err) {
            console.error('[Socket.io] Failed to emit new_comment', err);
        }

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

        const populatedReport = await ReportedPost.findById(report._id)
            .populate('citizenId', 'fullName email role')
            .populate({
                path: 'issueId',
                populate: {
                    path: 'citizenId',
                    select: 'fullName email',
                },
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
        const issues = await IssueReport.aggregate([
            { $match: { citizenId: req.user._id } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'issueId',
                    as: '_comments',
                },
            },
            { $addFields: { commentCount: { $size: '$_comments' } } },
            { $project: { _comments: 0 } },
        ]);

        await IssueReport.populate(issues, [
            { path: 'assignedAdminId', select: 'fullName department' },
        ]);

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

        const issue = await IssueReport.findById(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        // Upsert: one feedback per citizen per issue
        const feedback = await Feedback.findOneAndUpdate(
            { issueId, citizenId: req.user._id },
            { rating, comment: comment || '' },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        res.status(201).json(feedback);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/issues/:id
 * Citizen edits their own pending issue report (e.g. description, location).
 */
const editIssue = async (req, res, next) => {
    try {
        const issueId = req.params.id;
        const { description, category, location } = req.body;

        const issue = await IssueReport.findById(issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        // Verify ownership
        if (issue.citizenId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this issue.' });
        }

        // Only allow edits if status is pending
        if (issue.status.toLowerCase() !== 'pending') {
            return res.status(400).json({ message: 'Cannot edit an issue that is already being processed.' });
        }

        const updatedIssue = await IssueReport.findByIdAndUpdate(
            issueId,
            {
                description,
                category,
                location
            },
            { new: true, runValidators: true }
        )
            .populate('citizenId', 'fullName')
            .populate('assignedAdminId', 'fullName department');

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
