require('dotenv').config();
const mongoose = require('mongoose');

async function checkRemote() {
    try {
        console.log('Testing connection to:', process.env.MONGODB_URI.split('@')[1]); // Log domain only for safety
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('Remote users count:', users.length);
        users.forEach(u => console.log(`- ${u.email} | ${u.role}`));
    } catch (e) {
        console.error('Remote check failed:', e.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkRemote();
