const IssueReport = require('../models/IssueReport');

/**
 * Returns aggregated statistics for the SuperAdmin dashboard.
 */
const getAnalytics = async () => {
    const [totalByStatus, totalByCategory, topUrgent] = await Promise.all([
        // Count by status
        IssueReport.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // Count by category
        IssueReport.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),

        // Top 5 most urgent open issues
        IssueReport.find({ status: { $ne: 'Resolved' } })
            .sort({ urgencyCount: -1 })
            .limit(5)
            .select('description category status urgencyCount location'),
    ]);

    const statusMap = {};
    totalByStatus.forEach(({ _id, count }) => {
        statusMap[_id] = count;
    });

    const categoryMap = {};
    totalByCategory.forEach(({ _id, count }) => {
        categoryMap[_id] = count;
    });

    return {
        byStatus: statusMap,
        byCategory: categoryMap,
        topUrgentIssues: topUrgent,
    };
};

module.exports = { getAnalytics };
