const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
    getIssues,
    createIssue,
    getIssueById,
    voteOnIssue,
    addComment,
    reportIssue,
} = require('../controllers/issueController');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');

// GET /api/issues  – public feed
router.get('/', getIssues);

// POST /api/issues – citizen reporting
router.post(
    '/',
    requireAuth,
    requireRole(['CITIZEN']),
    [
        body('category')
            .isIn(['Water', 'Waste', 'Road', 'Electricity'])
            .withMessage('category must be Water, Waste, Road, or Electricity.'),
        body('description').notEmpty().withMessage('description is required.'),
        body('location.kebele').optional().isString(),
        body('draftedAt').optional().isISO8601().withMessage('draftedAt must be a valid ISO8601 date.'),
    ],
    validate,
    createIssue
);

// GET /api/issues/:id – single issue with comments
router.get('/:id', getIssueById);

// POST /api/issues/:id/vote – toggle urgency vote
router.post('/:id/vote', requireAuth, requireRole(['CITIZEN']), voteOnIssue);

// POST /api/issues/:id/comments – add comment
router.post(
    '/:id/comments',
    requireAuth,
    [body('text').notEmpty().withMessage('Comment text is required.')],
    validate,
    addComment
);

// POST /api/issues/:id/report – flag issue
router.post(
    '/:id/report',
    requireAuth,
    requireRole(['CITIZEN']),
    [body('reason').notEmpty().withMessage('reason is required.')],
    validate,
    reportIssue
);

module.exports = router;
