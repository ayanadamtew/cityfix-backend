const IssueReport = require('../models/IssueReport');

/**
 * Returns aggregated statistics for the SuperAdmin dashboard.
 */
const getAnalytics = async (department = null) => {
    const filter = department ? { category: department } : {};

    const [totalByStatus, totalByCategory, topUrgent] = await Promise.all([
        // Count by status
        IssueReport.aggregate([
            { $match: filter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // Count by category
        IssueReport.aggregate([
            { $match: filter },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),

        // Top 5 most urgent open issues
        IssueReport.find({ ...filter, status: { $ne: 'Resolved' } })
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
        totalIssues: totalByStatus.reduce((acc, curr) => acc + curr.count, 0),
        byStatus: statusMap,
        byCategory: categoryMap,
        topUrgentIssues: topUrgent,
        avgResolutionTimeDays: 2.4, // Mocked for now
        avgFeedbackRating: 4.2 // Mocked for now
    };
};

module.exports = { getAnalytics };
