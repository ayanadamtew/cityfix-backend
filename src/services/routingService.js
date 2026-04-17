const { User } = require('../models');

/**
 * Auto-Route: find the SectorAdmin whose department matches the issue category
 * and return their id (UUID).
 */
const findAdminByCategory = async (category) => {
    const admin = await User.findOne({ where: { role: 'SECTOR_ADMIN', department: category } });
    return admin ? admin.id : null;
};

module.exports = { findAdminByCategory };
