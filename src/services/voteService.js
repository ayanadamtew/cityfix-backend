const { IssueReport, UrgencyVote } = require('../models');
const { getIo } = require('./socketService');

/**
 * Toggle urgency vote for a citizen on an issue.
 * - If the citizen has NOT voted yet: create vote record and increment urgencyCount.
 * - If the citizen HAS voted: remove vote record and decrement urgencyCount.
 * Returns { action: 'voted' | 'unvoted', urgencyCount: Number }
 */
const toggleUrgencyVote = async (issueId, citizenId) => {
    const existingVote = await UrgencyVote.findOne({ where: { issueId, citizenId } });

    let updatedIssue;
    let action;

    if (existingVote) {
        // Remove vote
        await existingVote.destroy();
        await IssueReport.decrement('urgencyCount', { where: { id: issueId } });
        action = 'unvoted';
    } else {
        // Cast vote
        await UrgencyVote.create({ issueId, citizenId });
        await IssueReport.increment('urgencyCount', { where: { id: issueId } });
        action = 'voted';
    }

    updatedIssue = await IssueReport.findByPk(issueId);

    // Emit live update to all connected clients
    try {
        const io = getIo();
        io.emit('vote_updated', {
            issueId: updatedIssue.id,
            urgencyCount: updatedIssue.urgencyCount,
        });
    } catch (err) {
        console.error('[Socket.io] Failed to emit vote update', err);
    }

    return { action, urgencyCount: updatedIssue.urgencyCount };
};

module.exports = { toggleUrgencyVote };
