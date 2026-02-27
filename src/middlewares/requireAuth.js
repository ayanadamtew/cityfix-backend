const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * Verifies the Firebase Bearer token and attaches the MongoDB user to req.user.
 */
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('[requireAuth] REJECTED — No Authorization header or malformed header.');
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('[requireAuth] Firebase UID decoded:', decodedToken.uid);

        const user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!user) {
            console.warn('[requireAuth] REJECTED — Firebase UID', decodedToken.uid, 'not found in MongoDB. Did you call POST /api/auth/register?');
            return res.status(401).json({ message: 'Unauthorized: User not registered in system.' });
        }

        if (user.isDisabled) {
            console.warn('[requireAuth] REJECTED — User', user._id, 'is disabled.');
            return res.status(403).json({ message: 'Forbidden: Your account has been disabled. Please contact the administrator.' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('[requireAuth] REJECTED — Firebase token verification error:', err.message);
        return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
    }
};

module.exports = requireAuth;
