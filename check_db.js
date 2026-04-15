require('dotenv').config({ path: '/home/ayuda/Documents/fyp/cityfix-backend/.env' });
const mongoose = require('mongoose');
const IssueReport = require('/home/ayuda/Documents/fyp/cityfix-backend/src/models/IssueReport');

async function checkIssues() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cityfix');
        const count = await IssueReport.countDocuments();
        console.log(`Total issues: ${count}`);

        const distinctUsers = await IssueReport.distinct('citizenId');
        console.log(`Distinct citizenIds: ${distinctUsers.length}`);
        
        console.log('Sample citizenIds:', distinctUsers.slice(0, 5));
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkIssues();
