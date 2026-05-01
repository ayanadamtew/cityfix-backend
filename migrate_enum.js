const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
});

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        
        // Postgres ENUM rename value. 
        // We'll add 'Waiting Confirmation' and then we don't strictly need to remove 'Waiting Verification', 
        // but let's just add it or rename it. In Postgres >= 10, we can rename a value.
        await sequelize.query(`ALTER TYPE "enum_issue_reports_status" RENAME VALUE 'Waiting Verification' TO 'Waiting Confirmation';`);
        console.log('Altered enum_issue_reports_status');
        
        await sequelize.query(`ALTER TYPE "enum_assignments_status" RENAME VALUE 'Waiting Verification' TO 'Waiting Confirmation';`);
        console.log('Altered enum_assignments_status');
        
    } catch (err) {
        console.error('Error altering enums. They might already be altered, or need to add value instead of rename.', err);
    } finally {
        await sequelize.close();
    }
}

run();
