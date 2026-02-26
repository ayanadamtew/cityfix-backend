const mongoose = require('mongoose');
const User = require('./src/models/User');
const IssueReport = require('./src/models/IssueReport');
const { toggleUrgencyVote } = require('./src/services/voteService');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cityfix');
  
  // Create a dummy user
  const user = await User.create({ firebaseUid: 'testuser_' + Date.now(), fullName: 'Test User', email: 'test@example.com', role: 'CITIZEN' });
  
  // Find an issue
  const issue = await IssueReport.findOne();
  if (!issue) {
      console.log('No issues found');
      return;
  }
  
  console.log('Initial urgencyCount:', issue.urgencyCount);
  console.log('Initial votedUserIds:', issue.votedUserIds);
  
  let result = await toggleUrgencyVote(issue._id, user._id);
  console.log('After vote 1:', result);
  
  let issueAfter1 = await IssueReport.findById(issue._id);
  console.log('DB urgencyCount after 1:', issueAfter1.urgencyCount);
  console.log('DB votedUserIds after 1:', issueAfter1.votedUserIds);

  let result2 = await toggleUrgencyVote(issue._id, user._id);
  console.log('After vote 2:', result2);

  let issueAfter2 = await IssueReport.findById(issue._id);
  console.log('DB urgencyCount after 2:', issueAfter2.urgencyCount);
  console.log('DB votedUserIds after 2:', issueAfter2.votedUserIds);

  await mongoose.disconnect();
}

run().catch(console.error);
