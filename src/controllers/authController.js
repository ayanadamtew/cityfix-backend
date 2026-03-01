const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * POST /api/auth/register
 * Called after Firebase Auth signup to persist user in MongoDB.
 * Supports both phone-only users (no email) and email users.
 */
const register = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        const { fullName, phoneNumber, role, department } = req.body;

        // Derive email / phone from Firebase token or request body
        let email = decodedToken.email || req.body.email || undefined;
        if (email && email.endsWith('@cityfix.local')) {
            email = undefined; // Do not store dummy emails used for phone+password auth
        }
        const phone =
            decodedToken.phone_number || phoneNumber || undefined;

        // Prevent duplicate registrations
        const existing = await User.findOne({ firebaseUid: decodedToken.uid });
        if (existing) {
            return res.status(200).json({ message: 'User already registered.', user: existing });
        }

        const user = await User.create({
            firebaseUid: decodedToken.uid,
            email,
            fullName,
            phoneNumber: phone,
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

/**
 * POST /api/auth/fcm-token
 * Updates the user's FCM token for push notifications.
 */
const updateFcmToken = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ message: 'fcmToken is required.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { fcmToken },
            { new: true }
        );

        res.json({ message: 'FCM Token updated successfully', user });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/citizen/profile
 * Updates the user's profile information (currently just fullName).
 */
const updateProfile = async (req, res, next) => {
    console.log('[DEBUG] updateProfile controller reached');
    try {
        const { fullName } = req.body;
        if (!fullName) {
            return res.status(400).json({ message: 'fullName is required.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { fullName },
            { new: true }
        );

        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, getMe, updateFcmToken, updateProfile };
