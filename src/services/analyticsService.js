const IssueReport = require('../models/IssueReport');
const Feedback = require('../models/Feedback');

/**
 * Returns aggregated statistics for the SuperAdmin dashboard.
 */
const getAnalytics = async (department = null) => {
    const filter = department ? { category: department } : {};

    const [totalByStatus, totalByCategory, topUrgent, avgFeedbackResult, avgResTimeResult, locations] = await Promise.all([
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

        // Average feedback rating
        Feedback.aggregate([
            // Since Dashboard shows issues by department, we need to match feedbacks tied to those issues 
            // but for simplicity and lack of IssueReport $lookup in this basic aggregate, 
            // if department is filtering, we do a $lookup here.
            ...(department ? [
                {
                    $lookup: {
                        from: 'issuereports',
                        localField: 'issueId',
                        foreignField: '_id',
                        as: 'issue'
                    }
                },
                { $unwind: '$issue' },
                { $match: { 'issue.category': department } }
            ] : []),
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]),

        // Average resolution time in days
        IssueReport.aggregate([
            { $match: { ...filter, status: 'Resolved' } },
            {
                $group: {
                    _id: null,
                    avgResolverTimeMs: {
                        $avg: { $subtract: ['$updatedAt', '$createdAt'] }
                    }
                }
            }
        ]),

        // Basic location data for map
        IssueReport.find({ ...filter, 'location.latitude': { $ne: null }, 'location.longitude': { $ne: null } })
            .select('_id category status location urgencyCount createdAt')
    ]);

    // Pre-fill maps so frontend doesn't crash if a category has 0 issues
    const statusMap = { 'Pending': 0, 'In Progress': 0, 'Resolved': 0 };
    totalByStatus.forEach(({ _id, count }) => {
        statusMap[_id] = count;
    });

    const categoryMap = { 'Water': 0, 'Waste': 0, 'Road': 0, 'Electricity': 0 };
    if (department) {
        // If sector admin, they only see their own category
        categoryMap[department] = 0;
    }
    totalByCategory.forEach(({ _id, count }) => {
        categoryMap[_id] = count;
    });

    const avgFeedbackRating = avgFeedbackResult.length > 0 ? Number(avgFeedbackResult[0].avgRating.toFixed(1)) : 0;

    // Convert ms to days (1000 * 60 * 60 * 24 = 86400000)
    let avgResolutionTimeDays = 0;
    if (avgResTimeResult.length > 0 && avgResTimeResult[0].avgResolverTimeMs) {
        avgResolutionTimeDays = Number((avgResTimeResult[0].avgResolverTimeMs / 86400000).toFixed(1));
    }

    return {
        totalIssues: totalByStatus.reduce((acc, curr) => acc + curr.count, 0),
        byStatus: statusMap,
        byCategory: categoryMap,
        topUrgentIssues: topUrgent,
        avgResolutionTimeDays,
        avgFeedbackRating,
        locations
    };
};

module.exports = { getAnalytics };
