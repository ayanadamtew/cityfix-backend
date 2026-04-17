const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'test') {
    // SQLite in-memory for testing
    sequelize = new Sequelize('sqlite::memory:', {
        dialect: 'sqlite',
        logging: false,
    });
} else {
    // PostgreSQL for development and production
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {},
    });
}

// ─── Auto-seed default admin users (idempotent) ─────────────────────────────
const seedDefaultUsers = async () => {
    const defaultUsers = [
        {
            firebaseUid: 'lGkVwWGU23Y5g4YZ5NGM96DgDf02',
            email: 'admin@cityfix.org',
            fullName: 'System Administrator',
            role: 'SUPER_ADMIN',
            department: null,
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

    console.log('[Seed] Checking default admin users...');

    for (const user of defaultUsers) {
        try {
            await sequelize.query(
                `INSERT INTO users (id, "firebaseUid", email, "fullName", role, department, "isDisabled", "createdAt", "updatedAt")
                 VALUES (gen_random_uuid(), :firebaseUid, :email, :fullName, :role, :department, :isDisabled, NOW(), NOW())
                 ON CONFLICT (email) DO UPDATE SET
                   "firebaseUid" = EXCLUDED."firebaseUid",
                   "fullName"    = EXCLUDED."fullName",
                   role          = EXCLUDED.role,
                   department    = EXCLUDED.department,
                   "isDisabled"  = EXCLUDED."isDisabled",
                   "updatedAt"   = NOW()`,
                {
                    replacements: {
                        firebaseUid: user.firebaseUid,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        department: user.department,
                        isDisabled: user.isDisabled,
                    },
                    type: Sequelize.QueryTypes.INSERT,
                }
            );
            console.log(`[Seed] ✓ ${user.email}`);
        } catch (err) {
            console.error(`[Seed] ✗ Failed to seed ${user.email}:`, err.message);
        }
    }

    console.log('[Seed] Default users ready.');
};

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected successfully.');
        // sync({ alter: true }) keeps existing tables in sync with model definitions
        await sequelize.sync({ alter: true });
        console.log('Database schema synced.');

        // Auto-seed default admins (skip in test environment)
        if (process.env.NODE_ENV !== 'test') {
            await seedDefaultUsers();
        }
    } catch (err) {
        console.error('PostgreSQL connection error:', err.message);
        process.exit(1);
    }
};

module.exports = sequelize;
module.exports.connectDB = connectDB;
