const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function listUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers(100);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`${userRecord.uid} | ${userRecord.email} | ${JSON.stringify(userRecord.customClaims || {})}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers();
