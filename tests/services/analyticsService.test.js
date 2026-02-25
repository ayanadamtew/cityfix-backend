const db = require('../helpers/dbSetup');
const { makeCitizen } = require('../helpers/authFactory');
const { getAnalytics } = require('../../src/services/analyticsService');
const IssueReport = require('../../src/models/IssueReport');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

const seedIssue = (citizenId, category, status, urgencyCount = 0) =>
    IssueReport.create({ citizenId, category, description: 'Analytics test', status, urgencyCount });

describe('analyticsService – getAnalytics', () => {
    it('returns empty maps when no issues exist', async () => {
        const stats = await getAnalytics();
        expect(stats.byStatus).toEqual({});
        expect(stats.byCategory).toEqual({});
        expect(stats.topUrgentIssues).toHaveLength(0);
    });

    it('counts issues by status correctly', async () => {
        const { user } = await makeCitizen();
        await seedIssue(user._id, 'Water', 'Pending');
        await seedIssue(user._id, 'Road', 'Pending');
        await seedIssue(user._id, 'Waste', 'Resolved');

        const stats = await getAnalytics();
        expect(stats.byStatus['Pending']).toBe(2);
        expect(stats.byStatus['Resolved']).toBe(1);
    });

    it('counts issues by category correctly', async () => {
        const { user } = await makeCitizen();
        await seedIssue(user._id, 'Water', 'Pending');
        await seedIssue(user._id, 'Water', 'Pending');
        await seedIssue(user._id, 'Road', 'Pending');

        const stats = await getAnalytics();
        expect(stats.byCategory['Water']).toBe(2);
        expect(stats.byCategory['Road']).toBe(1);
    });

    it('returns top 5 most urgent unresolved issues', async () => {
        const { user } = await makeCitizen();
        // Create 6 pending issues with varying urgency
        for (let i = 1; i <= 6; i++) {
            await seedIssue(user._id, 'Water', 'Pending', i * 10);
        }
        // Resolved issue should NOT appear in top urgent
        await seedIssue(user._id, 'Road', 'Resolved', 999);

        const stats = await getAnalytics();
        expect(stats.topUrgentIssues).toHaveLength(5);
        // Highest urgency should be first
        expect(stats.topUrgentIssues[0].urgencyCount).toBe(60);
        // Resolved issue not included
        const hasResolved = stats.topUrgentIssues.some((i) => i.status === 'Resolved');
        expect(hasResolved).toBe(false);
    });
});
