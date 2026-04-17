/**
 * Sequelize + SQLite in-memory database setup for tests.
 * No external PostgreSQL required — tests are fully self-contained.
 */
// sequelize instance is now properly initialized as SQLite in src/config/db.js
// based on NODE_ENV === 'test'
const sequelize = require('../../src/config/db');

// Ensure models are registered to this instance
require('../../src/models');

const connect = async () => {
    await sequelize.sync({ force: true });
};

const closeDatabase = async () => {
    await sequelize.drop();
    await sequelize.close();
};

const clearDatabase = async () => {
    // Disable FK checks for SQLite, drop all data in reverse order
    await sequelize.query('PRAGMA foreign_keys = OFF;').catch(() => {});
    const models = Object.values(sequelize.models);
    for (const model of models) {
        await model.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    }
    await sequelize.query('PRAGMA foreign_keys = ON;').catch(() => {});
};

module.exports = { connect, closeDatabase, clearDatabase };
