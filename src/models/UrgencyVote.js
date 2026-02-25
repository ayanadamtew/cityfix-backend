const mongoose = require('mongoose');

const urgencyVoteSchema = new mongoose.Schema(
    {
        issueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IssueReport',
            required: true,
        },
        citizenId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound unique index – one vote per citizen per issue
urgencyVoteSchema.index({ issueId: 1, citizenId: 1 }, { unique: true });

module.exports = mongoose.model('UrgencyVote', urgencyVoteSchema);
