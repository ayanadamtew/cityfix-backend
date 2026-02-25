const User = require('../models/User');

/**
 * Auto-Route: find the SectorAdmin whose department matches the issue category
 * and return their ObjectId.
 */
const findAdminByCategory = async (category) => {
    const admin = await User.findOne({ role: 'SECTOR_ADMIN', department: category });
    return admin ? admin._id : null;
};

module.exports = { findAdminByCategory };
