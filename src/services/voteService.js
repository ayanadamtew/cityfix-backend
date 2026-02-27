const IssueReport = require('../models/IssueReport');
const UrgencyVote = require('../models/UrgencyVote');
const { getIo } = require('./socketService');

/**
 * Toggle urgency vote for a citizen on an issue.
 * - If the citizen has NOT voted yet: create vote record and increment urgencyCount.
 * - If the citizen HAS voted: remove vote record and decrement urgencyCount.
 * Returns { action: 'voted' | 'unvoted', urgencyCount: Number }
 *
 * Note: Uses atomic $inc updates on IssueReport instead of multi-document
 * transactions so the service works with both replica-set and standalone MongoDB.
 */
const toggleUrgencyVote = async (issueId, citizenId) => {
    const existingVote = await UrgencyVote.findOne({ issueId, citizenId });

    let updatedIssue;
    let action;

    if (existingVote) {
        // Remove vote
        await UrgencyVote.deleteOne({ _id: existingVote._id });
        updatedIssue = await IssueReport.findByIdAndUpdate(
            issueId,
            {
                $inc: { urgencyCount: -1 },
                $pull: { votedUserIds: citizenId },
            },
            { new: true }
        );
        action = 'unvoted';
    } else {
        // Cast vote
        await UrgencyVote.create({ issueId, citizenId });
        updatedIssue = await IssueReport.findByIdAndUpdate(
            issueId,
            {
                $inc: { urgencyCount: 1 },
                $addToSet: { votedUserIds: citizenId },
            },
            { new: true }
        );
        action = 'voted';
    }

    // Emit live update to all connected clients
    try {
        const io = getIo();
        io.emit('vote_updated', {
            issueId: updatedIssue._id.toString(),
            urgencyCount: updatedIssue.urgencyCount
        });
    } catch (err) {
        console.error('[Socket.io] Failed to emit vote update', err);
    }

    return { action, urgencyCount: updatedIssue.urgencyCount };
};

module.exports = { toggleUrgencyVote };
