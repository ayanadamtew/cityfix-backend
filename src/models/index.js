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

module.exports = { User, IssueReport, Comment, UrgencyVote, Feedback, ReportedPost };
