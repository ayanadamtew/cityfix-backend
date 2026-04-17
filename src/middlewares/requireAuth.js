const { admin } = require('../config/firebase');
const { User } = require('../models');

/**
 * Verifies the Firebase Bearer token and attaches the PostgreSQL user to req.user.
 */
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('[requireAuth] REJECTED — No Authorization header');
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log(`[requireAuth] Firebase UID decoded: ${decodedToken.uid}, email: ${decodedToken.email}`);

        let user = await User.findOne({ where: { firebaseUid: decodedToken.uid } });

        // Auto-sync Firebase UID for seeded admins if their UID is a placeholder or changed
        if (!user && decodedToken.email) {
            user = await User.findOne({ where: { email: decodedToken.email } });
            if (user && user.role !== 'CITIZEN') {
                await user.update({ firebaseUid: decodedToken.uid });
                console.log(`[requireAuth] Auto-synced Firebase UID for admin: ${user.email}`);
            } else if (user) {
                user = null;
            }
        }

        if (!user) {
            console.warn(`[requireAuth] REJECTED — User not found in DB. UID: ${decodedToken.uid}, Email: ${decodedToken.email}`);
            return res.status(401).json({ message: 'Unauthorized: User not registered in system.' });
        }

        if (user.isDisabled) {
            console.warn(`[requireAuth] REJECTED — User ${user.email} is disabled.`);
            return res.status(403).json({ message: 'Forbidden: Your account has been disabled.' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(`[requireAuth] REJECTED — Firebase token verif error: ${err.message}`);
        return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
    }
};

module.exports = requireAuth;
