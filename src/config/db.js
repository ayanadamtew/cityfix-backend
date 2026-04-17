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
    const { admin } = require('./firebase');

    const defaultUsers = [
        {
            email: 'admin@cityfix.org',
            password: 'super123',
            fullName: 'System Administrator',
            role: 'SUPER_ADMIN',
            department: null,
            isDisabled: false,
        },
        {
            email: 'water-admin@cityfix.org',
            password: 'water123',
            fullName: 'Water Department Admin',
            role: 'SECTOR_ADMIN',
            department: 'Water',
            isDisabled: false,
        },
        {
            email: 'waste-admin@cityfix.org',
            password: 'waste123',
            fullName: 'Waste Department Admin',
            role: 'SECTOR_ADMIN',
            department: 'Waste',
            isDisabled: false,
        },
        {
            email: 'road-admin@cityfix.org',
            password: 'road123',
            fullName: 'Road Department Admin',
            role: 'SECTOR_ADMIN',
            department: 'Road',
            isDisabled: false,
        },
        {
            email: 'electricity-admin@cityfix.org',
            password: 'electricity123',
            fullName: 'Electricity Department Admin',
            role: 'SECTOR_ADMIN',
            department: 'Electricity',
            isDisabled: false,
        },
    ];

    console.log('[Seed] Checking default admin users...');

    for (const user of defaultUsers) {
        try {
            // --- Resolve Firebase UID ---
            let firebaseUid;
            try {
                // Check if Firebase account already exists
                const existingUser = await admin.auth().getUserByEmail(user.email);
                firebaseUid = existingUser.uid;
                console.log(`[Seed] Firebase account already exists for ${user.email}`);
            } catch (fbErr) {
                if (fbErr.code === 'auth/user-not-found' && user.password) {
                    // Create new Firebase account
                    const newUser = await admin.auth().createUser({
                        email: user.email,
                        password: user.password,
                        displayName: user.fullName,
                    });
                    firebaseUid = newUser.uid;
                    console.log(`[Seed] Created Firebase account for ${user.email}`);
                } else if (fbErr.code === 'auth/user-not-found' && !user.password) {
                    console.warn(`[Seed] ⚠ No Firebase account found for ${user.email} and no password set — skipping`);
                    continue;
                } else {
                    throw fbErr;
                }
            }

            // --- Upsert into PostgreSQL ---
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
                        firebaseUid,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        department: user.department,
                        isDisabled: user.isDisabled,
                    },
                    type: Sequelize.QueryTypes.INSERT,
                }
            );
            console.log(`[Seed] ✓ ${user.email} (uid: ${firebaseUid})`);
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
