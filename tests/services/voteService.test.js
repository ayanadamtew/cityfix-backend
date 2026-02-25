const mongoose = require('mongoose');
const db = require('../helpers/dbSetup');
const { makeCitizen } = require('../helpers/authFactory');
const { toggleUrgencyVote } = require('../../src/services/voteService');
const IssueReport = require('../../src/models/IssueReport');
const UrgencyVote = require('../../src/models/UrgencyVote');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

const seedIssue = (citizenId) =>
    IssueReport.create({
        citizenId,
        category: 'Water',
        description: 'Test issue for vote service',
    });

describe('voteService – toggleUrgencyVote', () => {
    it('creates a vote and increments urgencyCount (action=voted)', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const result = await toggleUrgencyVote(issue._id, user._id);

        expect(result.action).toBe('voted');
        expect(result.urgencyCount).toBe(1);

        const vote = await UrgencyVote.findOne({ issueId: issue._id, citizenId: user._id });
        expect(vote).not.toBeNull();
    });

    it('removes the vote and decrements urgencyCount (action=unvoted)', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user._id);

        await toggleUrgencyVote(issue._id, user._id);       // vote
        const result = await toggleUrgencyVote(issue._id, user._id);  // unvote

        expect(result.action).toBe('unvoted');
        expect(result.urgencyCount).toBe(0);

        const vote = await UrgencyVote.findOne({ issueId: issue._id, citizenId: user._id });
        expect(vote).toBeNull();
    });

    it('allows multiple citizens to vote independently', async () => {
        const { user: c1 } = await makeCitizen();
        const { user: c2 } = await makeCitizen();
        const issue = await seedIssue(c1._id);

        await toggleUrgencyVote(issue._id, c1._id);
        const result = await toggleUrgencyVote(issue._id, c2._id);

        expect(result.urgencyCount).toBe(2);
    });

    it("c2 unvoting does not affect c1's vote", async () => {
        const { user: c1 } = await makeCitizen();
        const { user: c2 } = await makeCitizen();
        const issue = await seedIssue(c1._id);

        await toggleUrgencyVote(issue._id, c1._id);
        await toggleUrgencyVote(issue._id, c2._id);
        const result = await toggleUrgencyVote(issue._id, c2._id); // c2 unvotes

        expect(result.urgencyCount).toBe(1);

        const c1vote = await UrgencyVote.findOne({ issueId: issue._id, citizenId: c1._id });
        expect(c1vote).not.toBeNull();
    });
});
