const mongoose = require('mongoose');

const CATEGORIES = ['Water', 'Waste', 'Road', 'Electricity'];
const STATUSES = ['Pending', 'In Progress', 'Resolved'];

const issueReportSchema = new mongoose.Schema(
    {
        citizenId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assignedAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        category: {
            type: String,
            enum: CATEGORIES,
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        photoUrl: {
            type: String,
            default: null,
        },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String, trim: true },
            kebele: { type: String, trim: true },
        },
        status: {
            type: String,
            enum: STATUSES,
            default: 'Pending',
        },
        urgencyCount: {
            type: Number,
            default: 0,
        },
        votedUserIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        commentCount: {
            type: Number,
            default: 0,
        },
        draftedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Index for feed queries
issueReportSchema.index({ 'location.kebele': 1 });
issueReportSchema.index({ urgencyCount: -1 });
issueReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('IssueReport', issueReportSchema);
