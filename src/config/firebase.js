const admin = require('firebase-admin');
const path = require('path');

const initializeFirebase = () => {
    if (admin.apps.length) return; // already initialized

    let credential;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
    } else {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (!serviceAccountPath) {
            throw new Error('Firebase credentials are not set in environment variables.');
        }
        const serviceAccount = require(path.resolve(serviceAccountPath));
        credential = admin.credential.cert(serviceAccount);
    }

    admin.initializeApp({
        credential,
    });

    console.log('Firebase Admin SDK initialized.');
};

module.exports = { admin, initializeFirebase };
