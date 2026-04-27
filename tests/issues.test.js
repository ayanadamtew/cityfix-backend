const request = require('supertest');
const { v4: uuidv4 } = require('crypto').webcrypto
    ? require('crypto').randomUUID
        ? { v4: () => require('crypto').randomUUID() }
        : require('uuid')
    : require('uuid');
const app = require('../src/app');
const db = require('./helpers/dbSetup');
const { makeCitizen, makeSectorAdmin } = require('./helpers/authFactory');
const { IssueReport } = require('../src/models');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

// Helper: create an issue document directly via Sequelize
const seedIssue = async (citizenId, overrides = {}) =>
    IssueReport.create({
        citizenId,
        category: overrides.category || 'Water',
        description: overrides.description || 'Pipe burst on Bole road',
        status: overrides.status || 'Pending',
        urgencyCount: overrides.urgencyCount || 0,
        kebele: 'Kebele 05',
    });

// Helper: generate a random UUID for 404 tests
const fakeId = () => require('crypto').randomUUID
    ? require('crypto').randomUUID()
    : '00000000-0000-0000-0000-000000000000';

// ─── GET /api/issues ──────────────────────────────────────────────────────────
describe('GET /api/issues', () => {
    it('returns empty array when no issues exist', async () => {
        const { token } = await makeCitizen();
        const res = await request(app).get('/api/issues').set('Authorization', token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns all issues', async () => {
        const { user, token } = await makeCitizen();
        await seedIssue(user.id);
        await seedIssue(user.id, { category: 'Road' });

        const res = await request(app).get('/api/issues').set('Authorization', token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('filters by kebele', async () => {
        const { user, token } = await makeCitizen();
        await seedIssue(user.id, { description: 'Issue in 05' });
        await IssueReport.create({
            citizenId: user.id,
            category: 'Waste',
            description: 'Issue in 07',
            kebele: 'Kebele 07',
        });

        const res = await request(app).get('/api/issues?kebele=Kebele 05').set('Authorization', token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].description).toBe('Issue in 05');
    });

    it('sorts by urgency when sort=urgent', async () => {
        const { user, token } = await makeCitizen();
        await seedIssue(user.id, { description: 'Low urgency', urgencyCount: 1 });
        await seedIssue(user.id, { description: 'High urgency', urgencyCount: 10 });

        const res = await request(app).get('/api/issues?sort=urgent').set('Authorization', token);
        expect(res.statusCode).toBe(200);
        expect(res.body[0].description).toBe('High urgency');
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app).get('/api/issues');
        expect(res.statusCode).toBe(401);
    });
});

// ─── POST /api/issues ─────────────────────────────────────────────────────────
describe('POST /api/issues', () => {
    it('citizen can create an issue', async () => {
        const { token } = await makeCitizen();
        const res = await request(app)
            .post('/api/issues')
            .set('Authorization', token)
            .send({ category: 'Road', description: 'Pothole on main street' });

        expect(res.statusCode).toBe(201);
        expect(res.body.category).toBe('Road');
        expect(res.body.status).toBe('Pending');
    });

    it('auto-routes issue to matching sector admin', async () => {
        const { user: admin } = await makeSectorAdmin({ department: 'Electricity' });
        const { token } = await makeCitizen();

        const res = await request(app)
            .post('/api/issues')
            .set('Authorization', token)
            .send({ category: 'Electricity', description: 'Power outage' });

        expect(res.statusCode).toBe(201);
        expect(res.body.assignedAdminId).toBe(admin.id);
    });

    it('creates issue with draftedAt for offline sync', async () => {
        const { token } = await makeCitizen();
        const draftedAt = '2025-01-01T10:00:00.000Z';
        const res = await request(app)
            .post('/api/issues')
            .set('Authorization', token)
            .send({ category: 'Waste', description: 'Garbage pile', draftedAt });

        expect(res.statusCode).toBe(201);
        expect(new Date(res.body.draftedAt).toISOString()).toBe(draftedAt);
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app)
            .post('/api/issues')
            .send({ category: 'Water', description: 'Leak' });
        expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-citizen roles', async () => {
        const { token } = await makeSectorAdmin();
        const res = await request(app)
            .post('/api/issues')
            .set('Authorization', token)
            .send({ category: 'Water', description: 'Leak' });
        expect(res.statusCode).toBe(403);
    });

    it('returns 422 for invalid category', async () => {
        const { token } = await makeCitizen();
        const res = await request(app)
            .post('/api/issues')
            .set('Authorization', token)
            .send({ category: 'InvalidCat', description: 'Test' });
        expect(res.statusCode).toBe(422);
    });

    it('returns 422 if description is missing', async () => {
        const { token } = await makeCitizen();
        const res = await request(app)
            .post('/api/issues')
            .set('Authorization', token)
            .send({ category: 'Water' });
        expect(res.statusCode).toBe(422);
    });
});

// ─── GET /api/issues/:id ──────────────────────────────────────────────────────
describe('GET /api/issues/:id', () => {
    it('returns issue with empty comments array', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app).get(`/api/issues/${issue.id}`).set('Authorization', token);
        expect(res.statusCode).toBe(200);
        expect(res.body.issue.id).toBe(issue.id);
        expect(res.body.comments).toEqual([]);
    });

    it('returns 404 for a nonexistent issue', async () => {
        const { token } = await makeCitizen();
        const res = await request(app).get(`/api/issues/${fakeId()}`).set('Authorization', token);
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without auth token', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user.id);
        const res = await request(app).get(`/api/issues/${issue.id}`);
        expect(res.statusCode).toBe(401);
    });
});

// ─── POST /api/issues/:id/vote ────────────────────────────────────────────────
describe('POST /api/issues/:id/vote', () => {
    it('citizen can vote on an issue (action=voted)', async () => {
        const { user: citizen, token } = await makeCitizen();
        const issue = await seedIssue(citizen.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/vote`)
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.action).toBe('voted');
        expect(res.body.urgencyCount).toBe(1);
    });

    it('second vote by same citizen removes vote (action=unvoted)', async () => {
        const { user: citizen, token } = await makeCitizen();
        const issue = await seedIssue(citizen.id);

        await request(app)
            .post(`/api/issues/${issue.id}/vote`)
            .set('Authorization', token);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/vote`)
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.action).toBe('unvoted');
        expect(res.body.urgencyCount).toBe(0);
    });

    it('returns 404 for nonexistent issue', async () => {
        const { token } = await makeCitizen();
        const res = await request(app)
            .post(`/api/issues/${fakeId()}/vote`)
            .set('Authorization', token);
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 when not authenticated', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user.id);
        const res = await request(app).post(`/api/issues/${issue.id}/vote`);
        expect(res.statusCode).toBe(401);
    });
});

// ─── POST /api/issues/:id/comments ───────────────────────────────────────────
describe('POST /api/issues/:id/comments', () => {
    it('adds a comment to an issue', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/comments`)
            .set('Authorization', token)
            .send({ text: 'This needs urgent attention!' });

        expect(res.statusCode).toBe(201);
        expect(res.body.text).toBe('This needs urgent attention!');
        expect(res.body.issueId).toBe(issue.id);
    });

    it('returns 422 if comment text is empty', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/comments`)
            .set('Authorization', token)
            .send({ text: '' });

        expect(res.statusCode).toBe(422);
    });

    it('returns 401 when unauthenticated', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/comments`)
            .send({ text: 'Anonymous comment' });

        expect(res.statusCode).toBe(401);
    });

    it('returns 404 when issue does not exist', async () => {
        const { token } = await makeCitizen();

        const res = await request(app)
            .post(`/api/issues/${fakeId()}/comments`)
            .set('Authorization', token)
            .send({ text: 'Ghost comment' });

        expect(res.statusCode).toBe(404);
    });
});

// ─── POST /api/issues/:id/report ─────────────────────────────────────────────
describe('POST /api/issues/:id/report', () => {
    it('flags an issue with a reason', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/report`)
            .set('Authorization', token)
            .send({ reason: 'Spam content' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toMatch(/reported for review/i);
    });

    it('returns 422 if reason is missing', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/report`)
            .set('Authorization', token)
            .send({});

        expect(res.statusCode).toBe(422);
    });

    it('returns 404 for nonexistent issue', async () => {
        const { token } = await makeCitizen();

        const res = await request(app)
            .post(`/api/issues/${fakeId()}/report`)
            .set('Authorization', token)
            .send({ reason: 'Inappropriate' });

        expect(res.statusCode).toBe(404);
    });
});

// ─── DELETE /api/issues/:id ───────────────────────────────────────────────────
describe('DELETE /api/issues/:id', () => {
    it('citizen can delete their own pending issue', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id, { status: 'Pending' });

        const res = await request(app)
            .delete(`/api/issues/${issue.id}`)
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/deleted successfully/i);

        const checkIssue = await IssueReport.findByPk(issue.id);
        expect(checkIssue).toBeNull();
    });

    it('returns 403 trying to delete someone else\'s issue', async () => {
        const { user: citizen1 } = await makeCitizen();
        const { token: token2 } = await makeCitizen();
        const issue = await seedIssue(citizen1.id, { status: 'Pending' });

        const res = await request(app)
            .delete(`/api/issues/${issue.id}`)
            .set('Authorization', token2);

        expect(res.statusCode).toBe(403);
    });

    it('returns 400 trying to delete an issue that is not Pending', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id, { status: 'In Progress' });

        const res = await request(app)
            .delete(`/api/issues/${issue.id}`)
            .set('Authorization', token);

        expect(res.statusCode).toBe(400);
    });

    it('returns 404 for nonexistent issue', async () => {
        const { token } = await makeCitizen();

        const res = await request(app)
            .delete(`/api/issues/${fakeId()}`)
            .set('Authorization', token);

        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without auth token', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user.id);
        const res = await request(app).delete(`/api/issues/${issue.id}`);
        expect(res.statusCode).toBe(401);
    });
});

// ─── GET /api/issues/mine ─────────────────────────────────────────────────────
describe('GET /api/issues/mine', () => {
    it("returns only the authenticated citizen's own issues", async () => {
        const { user: citizen1, token: token1 } = await makeCitizen();
        const { user: citizen2 } = await makeCitizen();

        await seedIssue(citizen1.id, { description: 'Mine' });
        await seedIssue(citizen2.id, { description: 'Not mine' });

        const res = await request(app)
            .get('/api/issues/mine')
            .set('Authorization', token1);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].description).toBe('Mine');
    });

    it('returns empty array when citizen has no issues', async () => {
        const { token } = await makeCitizen();
        const res = await request(app).get('/api/issues/mine').set('Authorization', token);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app).get('/api/issues/mine');
        expect(res.statusCode).toBe(401);
    });
});

// ─── POST /api/issues/:id/feedback ───────────────────────────────────────────
describe('POST /api/issues/:id/feedback', () => {
    it('citizen can submit a star rating for their resolved issue', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id, { status: 'Resolved' });

        const res = await request(app)
            .post(`/api/issues/${issue.id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 4, comment: 'Fixed quickly!' });

        expect(res.statusCode).toBe(201);
        expect(res.body.rating).toBe(4);
        expect(res.body.comment).toBe('Fixed quickly!');
    });

    it('second submission updates the existing feedback (upsert)', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id, { status: 'Resolved' });

        await request(app)
            .post(`/api/issues/${issue.id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 2 });

        const res = await request(app)
            .post(`/api/issues/${issue.id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 5, comment: 'Much better now!' });

        expect(res.statusCode).toBe(201);
        expect(res.body.rating).toBe(5);
    });

    it('returns 422 for rating out of range', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 6 });

        expect(res.statusCode).toBe(422);
    });

    it('returns 422 when rating is missing', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/feedback`)
            .set('Authorization', token)
            .send({ comment: 'No rating provided' });

        expect(res.statusCode).toBe(422);
    });

    it('returns 404 for a nonexistent issue', async () => {
        const { token } = await makeCitizen();

        const res = await request(app)
            .post(`/api/issues/${fakeId()}/feedback`)
            .set('Authorization', token)
            .send({ rating: 3 });

        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without auth token', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user.id);

        const res = await request(app)
            .post(`/api/issues/${issue.id}/feedback`)
            .send({ rating: 4 });

        expect(res.statusCode).toBe(401);
    });
});

// ─── GET /api/issues/check-duplicate ─────────────────────────────────────────
describe('GET /api/issues/check-duplicate', () => {
    // Helper: seed an issue with coordinates
    const seedGeoIssue = async (citizenId, lat, lng, overrides = {}) =>
        IssueReport.create({
            citizenId,
            category: overrides.category || 'Water',
            description: overrides.description || 'Geo issue',
            status: overrides.status || 'Pending',
            latitude: lat,
            longitude: lng,
            kebele: 'Kebele 05',
        });

    it('returns isDuplicate false when no nearby reports exist', async () => {
        const { token } = await makeCitizen();
        const res = await request(app)
            .get('/api/issues/check-duplicate?latitude=7.6756&longitude=36.8358&category=Water')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.isDuplicate).toBe(false);
        expect(res.body.nearbyReports).toHaveLength(0);
    });

    it('returns isDuplicate true when a report with same category exists within 10m', async () => {
        const { user, token } = await makeCitizen();
        // Seed an issue at exact location
        await seedGeoIssue(user.id, 7.6756, 36.8358, { category: 'Water' });

        // Query from the same point
        const res = await request(app)
            .get('/api/issues/check-duplicate?latitude=7.6756&longitude=36.8358&category=Water')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.isDuplicate).toBe(true);
        expect(res.body.nearbyReports.length).toBeGreaterThanOrEqual(1);
        expect(res.body.nearbyReports[0].distance).toBeLessThanOrEqual(10);
    });

    it('returns isDuplicate false when nearby report has a different category', async () => {
        const { user, token } = await makeCitizen();
        await seedGeoIssue(user.id, 7.6756, 36.8358, { category: 'Road' });

        const res = await request(app)
            .get('/api/issues/check-duplicate?latitude=7.6756&longitude=36.8358&category=Water')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.isDuplicate).toBe(false);
    });

    it('returns isDuplicate false when nearest report is more than 10m away', async () => {
        const { user, token } = await makeCitizen();
        // ~100m offset in latitude
        await seedGeoIssue(user.id, 7.6766, 36.8358, { category: 'Water' });

        const res = await request(app)
            .get('/api/issues/check-duplicate?latitude=7.6756&longitude=36.8358&category=Water')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.isDuplicate).toBe(false);
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app)
            .get('/api/issues/check-duplicate?latitude=7.6756&longitude=36.8358&category=Water');

        expect(res.statusCode).toBe(401);
    });
});
