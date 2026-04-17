#!/usr/bin/env node
/**
 * Generates a Firebase custom token and exchanges it for an ID token.
 * Usage:  node get-test-token.js [uid]
 *
 * If no uid is provided, it lists all Firebase users so you can pick one.
 * The printed ID token can be pasted into Postman's Authorization header.
 */
require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require(path.resolve(
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
    ));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

async function listUsers() {
    const listResult = await admin.auth().listUsers(20);
    console.log('\n📋 Firebase Users:');
    console.log('─'.repeat(70));
    listResult.users.forEach((u, i) => {
        console.log(
            `  ${i + 1}. UID: ${u.uid}  |  Email: ${u.email || 'N/A'}  |  Phone: ${u.phoneNumber || 'N/A'}`
        );
    });
    console.log('─'.repeat(70));
    console.log('\nRun again with a UID:  node get-test-token.js <uid>\n');
}

async function getIdToken(uid) {
    // Step 1: Create a custom token using Admin SDK
    const customToken = await admin.auth().createCustomToken(uid);

    if (!FIREBASE_API_KEY) {
        console.log('\n⚠️  FIREBASE_API_KEY not set in .env');
        console.log('To exchange the custom token for an ID token automatically,');
        console.log('add your Firebase Web API Key to .env:\n');
        console.log('  FIREBASE_API_KEY=AIzaSy...\n');
        console.log('You can find it in the Firebase Console → Project Settings → General → Web API Key\n');
        console.log('For now, here is the custom token (use the manual method below):');
        console.log('─'.repeat(70));
        console.log(customToken);
        console.log('─'.repeat(70));
        console.log('\n📌 Manual exchange: POST to');
        console.log(`   https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_API_KEY`);
        console.log('   Body: { "token": "<customToken>", "returnSecureToken": true }');
        console.log('   Copy the "idToken" from the response.\n');
        return;
    }

    // Step 2: Exchange custom token for an ID token via Firebase REST API
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });

    const data = await response.json();

    if (data.error) {
        console.error('\n❌ Error:', data.error.message);
        return;
    }

    console.log('\n✅ ID Token for UID:', uid);
    console.log('─'.repeat(70));
    console.log(data.idToken);
    console.log('─'.repeat(70));
    console.log('\n📋 Paste this into Postman → Authorization → Bearer Token');
    console.log(`⏰ Expires in: ${Math.round(data.expiresIn / 60)} minutes\n`);
}

async function main() {
    const uid = process.argv[2];
    if (!uid) {
        await listUsers();
    } else {
        await getIdToken(uid);
    }
    process.exit(0);
}

main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
