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

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected successfully.');
        // sync({ alter: true }) keeps existing tables in sync with model definitions
        await sequelize.sync({ alter: true });
        console.log('Database schema synced.');
    } catch (err) {
        console.error('PostgreSQL connection error:', err.message);
        process.exit(1);
    }
};

module.exports = sequelize;
module.exports.connectDB = connectDB;
