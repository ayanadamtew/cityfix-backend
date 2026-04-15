require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function seedRemoteDB() {
    try {
        console.log('Connecting to remote MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        
        const users = [
            // System Admin
            {
                firebaseUid: 'lGkVwWGU23Y5g4YZ5NGM96DgDf02',
                email: 'admin@cityfix.org',
                fullName: 'System Administrator',
                role: 'SUPER_ADMIN',
                isDisabled: false,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            // Sector Admins
            {
                firebaseUid: 'water-admin-uid-placeholder',
                email: 'water-admin@cityfix.org',
                fullName: 'Water Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Water',
                isDisabled: false,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                firebaseUid: 'waste-admin-uid-placeholder',
                email: 'waste-admin@cityfix.org',
                fullName: 'Waste Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Waste',
                isDisabled: false,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                firebaseUid: 'road-admin-uid-placeholder',
                email: 'road-admin@cityfix.org',
                fullName: 'Road Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Road',
                isDisabled: false,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                firebaseUid: 'electricity-admin-uid-placeholder',
                email: 'electricity-admin@cityfix.org',
                fullName: 'Electricity Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Electricity',
                isDisabled: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        console.log(`Seeding ${users.length} users into the 'users' collection...`);
        
        for (const user of users) {
            await db.collection('users').updateOne(
                { email: user.email },
                { $set: user },
                { upsert: true }
            );
            console.log(`- Seeded/Updated: ${user.email}`);
        }

        console.log('Remote database seeding complete!');
    } catch (e) {
        console.error('Error seeding remote database:', e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedRemoteDB();
