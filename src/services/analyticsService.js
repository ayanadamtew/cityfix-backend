const { IssueReport, Feedback, User, Assignment } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Returns aggregated statistics for the admin dashboard.
 * @param {string|null} department - Filter by department for SECTOR_ADMIN, null for SUPER_ADMIN.
 */
const getAnalytics = async (department = null) => {
    const where = department ? { category: department } : {};

    // ── 1. Count by status ────────────────────────────────────────────────────
    const statusRows = await IssueReport.findAll({
        where,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
    });

    // ── 2. Count by category ──────────────────────────────────────────────────
    const categoryRows = await IssueReport.findAll({
        where,
        attributes: ['category', [fn('COUNT', col('id')), 'count']],
        group: ['category'],
        raw: true,
    });

    // ── 2b. Count by subcategory ──────────────────────────────────────────────
    const subcategoryRows = await IssueReport.findAll({
        where: { ...where, subcategory: { [Op.ne]: null } },
        attributes: ['category', 'subcategory', [fn('COUNT', col('id')), 'count']],
        group: ['category', 'subcategory'],
        raw: true,
    });

    // ── 3. Top 5 most urgent open issues ─────────────────────────────────────
    const topUrgent = await IssueReport.findAll({
        where: { ...where, status: { [Op.ne]: 'Resolved' } },
        order: [['urgencyCount', 'DESC']],
        limit: 5,
        attributes: ['id', 'description', 'category', 'subcategory', 'status', 'urgencyCount',
            'latitude', 'longitude', 'address', 'kebele'],
    });

    // ── 4. Average feedback rating ────────────────────────────────────────────
    let avgFeedbackQuery;
    if (department) {
        avgFeedbackQuery = await Feedback.findAll({
            include: [{
                model: IssueReport,
                as: 'IssueReport',
                where: { category: department },
                attributes: [],
            }],
            attributes: [[fn('AVG', col('Feedback.rating')), 'avgRating']],
            raw: true,
        });
    } else {
        avgFeedbackQuery = await Feedback.findAll({
            attributes: [[fn('AVG', col('rating')), 'avgRating']],
            raw: true,
        });
    }

    // ── 5. Average resolution time in days ───────────────────────────────────
    const resolvedWhere = { ...where, status: 'Resolved' };
    const avgResRows = await IssueReport.findAll({
        where: resolvedWhere,
        attributes: [
            [fn('AVG', literal('"updatedAt" - "createdAt"')), 'avgInterval'],
        ],
        raw: true,
    });

    // ── 6. Location data for map ──────────────────────────────────────────────
    const locations = await IssueReport.findAll({
        where: {
            ...where,
            latitude: { [Op.ne]: null },
            longitude: { [Op.ne]: null },
        },
        attributes: ['id', 'category', 'subcategory', 'status', 'latitude', 'longitude',
            'address', 'kebele', 'urgencyCount', 'createdAt'],
    });

    // ── Build result maps ─────────────────────────────────────────────────────
    const statusMap = { Pending: 0, Approved: 0, Assigned: 0, 'In Progress': 0, 'Waiting Confirmation': 0, Resolved: 0, Rejected: 0 };
    statusRows.forEach(({ status, count }) => {
        statusMap[status] = parseInt(count, 10);
    });

    const categoryMap = { Water: 0, Waste: 0, Road: 0, Electricity: 0 };
    if (department) categoryMap[department] = 0;
    categoryRows.forEach(({ category, count }) => {
        categoryMap[category] = parseInt(count, 10);
    });

    // Build subcategory map grouped by category
    const bySubcategory = {};
    subcategoryRows.forEach(({ category, subcategory, count }) => {
        if (!bySubcategory[category]) bySubcategory[category] = {};
        bySubcategory[category][subcategory] = parseInt(count, 10);
    });

    const avgFeedbackRating =
        avgFeedbackQuery[0]?.avgRating != null
            ? Number(parseFloat(avgFeedbackQuery[0].avgRating).toFixed(1))
            : 0;

    // PostgreSQL INTERVAL → seconds via EPOCH; SQLite returns fractional days.
    let avgResolutionTimeDays = 0;
    const rawInterval = avgResRows[0]?.avgInterval;
    if (rawInterval != null) {
        if (typeof rawInterval === 'object' && rawInterval.seconds !== undefined) {
            avgResolutionTimeDays = Number((rawInterval.seconds / 86400).toFixed(1));
        } else if (typeof rawInterval === 'number') {
            avgResolutionTimeDays = Number((rawInterval / 86400000).toFixed(1));
        }
    }

    // ── 7. Technician stats ───────────────────────────────────────────────────
    const techWhere = department ? { department, role: 'TECHNICIAN' } : { role: 'TECHNICIAN' };
    const totalTechnicians = await User.count({ where: techWhere });
    const activeTechnicians = await User.count({ where: { ...techWhere, isDisabled: false } });

    const totalAssignments = await Assignment.count();
    const completedAssignments = await Assignment.count({ where: { status: 'Resolved' } });

    // ── 8. Technician performance by specialization ──────────────────────────
    const technicians = await User.findAll({
        where: techWhere,
        attributes: ['id', 'fullName', 'specialization', 'averageRating', 'ratingCount'],
    });

    const technicianPerformance = [];
    for (const tech of technicians) {
        const resolved = await Assignment.count({ where: { technicianId: tech.id, status: 'Resolved' } });
        const total = await Assignment.count({ where: { technicianId: tech.id } });
        technicianPerformance.push({
            id: tech.id,
            fullName: tech.fullName,
            specialization: tech.specialization,
            averageRating: tech.averageRating,
            ratingCount: tech.ratingCount,
            resolvedCount: resolved,
            totalAssigned: total,
        });
    }

    return {
        totalIssues: Object.values(statusMap).reduce((a, b) => a + b, 0),
        byStatus: statusMap,
        byCategory: categoryMap,
        bySubcategory,
        topUrgentIssues: topUrgent,
        avgResolutionTimeDays,
        avgFeedbackRating,
        locations,
        technicianStats: {
            totalTechnicians,
            activeTechnicians,
            totalAssignments,
            completedAssignments,
        },
        technicianPerformance,
    };
};

module.exports = { getAnalytics };
