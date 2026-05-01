const { admin } = require('./src/config/firebase');

async function test() {
  try {
    require('dotenv').config();
    const db = require('./src/config/db');
    await db.authenticate();
    const User = require('./src/models/User');

    // Create user in PostgreSQL
    const technician = await User.create({
        firebaseUid: 'test-firebase-uid-' + Date.now(),
        email: 'test-tech-' + Date.now() + '@example.com',
        fullName: 'Test Tech',
        phoneNumber: null,
        role: 'TECHNICIAN',
        department: 'Water',
        specialization: ['Plumbing', 'Pipe Repair'],
    });
    console.log("Success:", technician.id);
    process.exit(0);
  } catch (err) {
    console.error("Error creating:", err);
    process.exit(1);
  }
}
test();
