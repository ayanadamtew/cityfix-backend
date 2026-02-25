const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * POST /api/auth/register
 * Called after Firebase Auth signup to persist user in MongoDB.
 */
const register = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        const { fullName, phoneNumber, role, department } = req.body;

        // Prevent duplicate registrations
        const existing = await User.findOne({ firebaseUid: decodedToken.uid });
        if (existing) {
            return res.status(200).json({ message: 'User already registered.', user: existing });
        }

        const user = await User.create({
            firebaseUid: decodedToken.uid,
            email: decodedToken.email,
            fullName,
            phoneNumber,
            role: role || 'CITIZEN',
            department: role === 'SECTOR_ADMIN' ? department : undefined,
        });

        res.status(201).json({ message: 'User registered successfully.', user });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/users/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
    res.json(req.user);
};

module.exports = { register, getMe };
