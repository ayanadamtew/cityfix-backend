require('dotenv').config();
const { admin, initializeFirebase } = require('./src/config/firebase');

async function testToken() {
    initializeFirebase();
    const { execSync } = require('child_process');
    const tokenStr = execSync('node get-test-token.js zQpVFHp1mMQ6UsT8cCayOaR1Wmr2 | grep -A 1 "✅ ID Token" | tail -n 1').toString().trim();
    
    try {
        const decoded = await admin.auth().verifyIdToken(tokenStr);
        console.log('Success:', decoded.uid);
    } catch (e) {
        console.error('Verify error:', e.message);
    }
    process.exit(0);
}
testToken();
