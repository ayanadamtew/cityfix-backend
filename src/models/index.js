/**
 * Central model registry.
 * Imports all Sequelize models, defines associations, and re-exports them.
 * Every file that needs a model should import from here.
 */
const User = require('./User');
const IssueReport = require('./IssueReport');
const Comment = require('./Comment');
const UrgencyVote = require('./UrgencyVote');
const Feedback = require('./Feedback');
const ReportedPost = require('./ReportedPost');
const Assignment = require('./Assignment');
const CompletionProof = require('./CompletionProof');
const StatusHistory = require('./StatusHistory');

// ─── User ↔ IssueReport ───────────────────────────────────────────────────────
User.hasMany(IssueReport, { foreignKey: 'citizenId', as: 'reportedIssues' });
IssueReport.belongsTo(User, { foreignKey: 'citizenId', as: 'citizen' });

User.hasMany(IssueReport, { foreignKey: 'assignedAdminId', as: 'assignedIssues' });
IssueReport.belongsTo(User, { foreignKey: 'assignedAdminId', as: 'assignedAdmin' });

// ─── IssueReport ↔ Comment ────────────────────────────────────────────────────
IssueReport.hasMany(Comment, { foreignKey: 'issueId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(IssueReport, { foreignKey: 'issueId' });

User.hasMany(Comment, { foreignKey: 'authorId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// ─── IssueReport ↔ UrgencyVote ───────────────────────────────────────────────
IssueReport.hasMany(UrgencyVote, { foreignKey: 'issueId', as: 'votes', onDelete: 'CASCADE' });
UrgencyVote.belongsTo(IssueReport, { foreignKey: 'issueId' });

User.hasMany(UrgencyVote, { foreignKey: 'citizenId', as: 'votes' });
UrgencyVote.belongsTo(User, { foreignKey: 'citizenId' });

// ─── IssueReport ↔ Feedback ──────────────────────────────────────────────────
IssueReport.hasMany(Feedback, { foreignKey: 'issueId', as: 'feedbacks', onDelete: 'CASCADE' });
Feedback.belongsTo(IssueReport, { foreignKey: 'issueId' });

User.hasMany(Feedback, { foreignKey: 'citizenId', as: 'feedbacks' });
Feedback.belongsTo(User, { foreignKey: 'citizenId' });

// ─── IssueReport ↔ ReportedPost ──────────────────────────────────────────────
IssueReport.hasMany(ReportedPost, { foreignKey: 'issueId', as: 'reports', onDelete: 'CASCADE' });
ReportedPost.belongsTo(IssueReport, { foreignKey: 'issueId', as: 'issue' });

User.hasMany(ReportedPost, { foreignKey: 'citizenId', as: 'reportedPosts' });
ReportedPost.belongsTo(User, { foreignKey: 'citizenId', as: 'reporter' });

// ─── IssueReport ↔ Assignment ────────────────────────────────────────────────
IssueReport.hasOne(Assignment, { foreignKey: 'issueId', as: 'assignment', onDelete: 'CASCADE' });
Assignment.belongsTo(IssueReport, { foreignKey: 'issueId', as: 'issue' });

// ─── User (Technician) ↔ Assignment ─────────────────────────────────────────
User.hasMany(Assignment, { foreignKey: 'technicianId', as: 'technicianAssignments' });
Assignment.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

User.hasMany(Assignment, { foreignKey: 'assignedById', as: 'adminAssignments' });
Assignment.belongsTo(User, { foreignKey: 'assignedById', as: 'assignedBy' });

// ─── Assignment ↔ CompletionProof ────────────────────────────────────────────
Assignment.hasMany(CompletionProof, { foreignKey: 'assignmentId', as: 'proofs', onDelete: 'CASCADE' });
CompletionProof.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });

User.hasMany(CompletionProof, { foreignKey: 'technicianId', as: 'submittedProofs' });
CompletionProof.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

CompletionProof.belongsTo(User, { foreignKey: 'verifiedById', as: 'verifiedBy' });

// ─── IssueReport ↔ StatusHistory ─────────────────────────────────────────────
IssueReport.hasMany(StatusHistory, { foreignKey: 'issueId', as: 'statusHistory', onDelete: 'CASCADE' });
StatusHistory.belongsTo(IssueReport, { foreignKey: 'issueId' });

StatusHistory.belongsTo(User, { foreignKey: 'changedById', as: 'changedBy' });

module.exports = {
    User,
    IssueReport,
    Comment,
    UrgencyVote,
    Feedback,
    ReportedPost,
    Assignment,
    CompletionProof,
    StatusHistory,
};
