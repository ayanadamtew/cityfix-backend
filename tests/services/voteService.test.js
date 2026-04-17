const db = require('../helpers/dbSetup');
const { makeCitizen } = require('../helpers/authFactory');
const { toggleUrgencyVote } = require('../../src/services/voteService');
const { IssueReport, UrgencyVote } = require('../../src/models');

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
        const issue = await seedIssue(user.id);

        const result = await toggleUrgencyVote(issue.id, user.id);

        expect(result.action).toBe('voted');
        expect(result.urgencyCount).toBe(1);

        const vote = await UrgencyVote.findOne({ where: { issueId: issue.id, citizenId: user.id } });
        expect(vote).not.toBeNull();
    });

    it('removes the vote and decrements urgencyCount (action=unvoted)', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user.id);

        await toggleUrgencyVote(issue.id, user.id);       // vote
        const result = await toggleUrgencyVote(issue.id, user.id);  // unvote

        expect(result.action).toBe('unvoted');
        expect(result.urgencyCount).toBe(0);

        const vote = await UrgencyVote.findOne({ where: { issueId: issue.id, citizenId: user.id } });
        expect(vote).toBeNull();
    });

    it('allows multiple citizens to vote independently', async () => {
        const { user: c1 } = await makeCitizen();
        const { user: c2 } = await makeCitizen();
        const issue = await seedIssue(c1.id);

        await toggleUrgencyVote(issue.id, c1.id);
        const result = await toggleUrgencyVote(issue.id, c2.id);

        expect(result.urgencyCount).toBe(2);
    });

    it("c2 unvoting does not affect c1's vote", async () => {
        const { user: c1 } = await makeCitizen();
        const { user: c2 } = await makeCitizen();
        const issue = await seedIssue(c1.id);

        await toggleUrgencyVote(issue.id, c1.id);
        await toggleUrgencyVote(issue.id, c2.id);
        const result = await toggleUrgencyVote(issue.id, c2.id); // c2 unvotes

        expect(result.urgencyCount).toBe(1);

        const c1vote = await UrgencyVote.findOne({ where: { issueId: issue.id, citizenId: c1.id } });
        expect(c1vote).not.toBeNull();
    });
});
