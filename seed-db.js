require('dotenv').config();
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Use DATABASE_URL from .env
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

async function seedDB() {
    try {
        console.log('Connecting to PostgreSQL...');
        await sequelize.authenticate();

        const users = [
            {
                firebaseUid: 'lGkVwWGU23Y5g4YZ5NGM96DgDf02',
                email: 'admin@cityfix.org',
                fullName: 'System Administrator',
                role: 'SUPER_ADMIN',
                isDisabled: false,
            },
            {
                firebaseUid: 'water-admin-uid-placeholder',
                email: 'water-admin@cityfix.org',
                fullName: 'Water Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Water',
                isDisabled: false,
            },
            {
                firebaseUid: 'waste-admin-uid-placeholder',
                email: 'waste-admin@cityfix.org',
                fullName: 'Waste Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Waste',
                isDisabled: false,
            },
            {
                firebaseUid: 'road-admin-uid-placeholder',
                email: 'road-admin@cityfix.org',
                fullName: 'Road Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Road',
                isDisabled: false,
            },
            {
                firebaseUid: 'electricity-admin-uid-placeholder',
                email: 'electricity-admin@cityfix.org',
                fullName: 'Electricity Department Admin',
                role: 'SECTOR_ADMIN',
                department: 'Electricity',
                isDisabled: false,
            },
        ];

        console.log(`Seeding ${users.length} users...`);

        for (const user of users) {
            const [, created] = await sequelize.query(
                `INSERT INTO users (id, "firebaseUid", email, "fullName", role, department, "isDisabled", "createdAt", "updatedAt")
                 VALUES (:id, :firebaseUid, :email, :fullName, :role, :department, :isDisabled, NOW(), NOW())
                 ON CONFLICT (email) DO UPDATE SET
                   "firebaseUid" = EXCLUDED."firebaseUid",
                   "fullName"    = EXCLUDED."fullName",
                   role          = EXCLUDED.role,
                   department    = EXCLUDED.department,
                   "isDisabled"  = EXCLUDED."isDisabled",
                   "updatedAt"   = NOW()
                 RETURNING *`,
                {
                    replacements: {
                        id: uuidv4(),
                        firebaseUid: user.firebaseUid,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        department: user.department || null,
                        isDisabled: user.isDisabled,
                    },
                    type: Sequelize.QueryTypes.INSERT,
                }
            );
            console.log(`- Seeded/Updated: ${user.email}`);
        }

        console.log('Seeding complete!');
    } catch (e) {
        console.error('Error seeding database:', e);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

seedDB();
