/**
 * RBAC middleware factory.
 * Usage: requireRole(['SUPER_ADMIN', 'SECTOR_ADMIN'])
 */
const requireRole = (rolesArray) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!rolesArray.includes(req.user.role)) {
        return res.status(403).json({
            message: `Forbidden: requires one of [${rolesArray.join(', ')}].`,
        });
    }

    next();
};

module.exports = requireRole;
