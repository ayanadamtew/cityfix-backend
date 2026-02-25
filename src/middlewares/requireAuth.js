const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * Verifies the Firebase Bearer token and attaches the MongoDB user to req.user.
 */
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User not registered in system.' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Firebase token verification error:', err.message);
        return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
    }
};

module.exports = requireAuth;
