const admin = require('firebase-admin');
const path = require('path');

const initializeFirebase = () => {
    if (admin.apps.length) return; // already initialized

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in environment variables.');
    }

    const serviceAccount = require(path.resolve(serviceAccountPath));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin SDK initialized.');
};

module.exports = { admin, initializeFirebase };
