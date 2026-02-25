const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const db = require('./helpers/dbSetup');
const { makeCitizen, makeSectorAdmin } = require('./helpers/authFactory');
const IssueReport = require('../src/models/IssueReport');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

// Helper: create an issue document directly
const seedIssue = async (citizenId, overrides = {}) =>
    IssueReport.create({
        citizenId,
        category: overrides.category || 'Water',
        description: overrides.description || 'Pipe burst on Bole road',
        status: overrides.status || 'Pending',
        urgencyCount: overrides.urgencyCount || 0,
        location: { kebele: 'Kebele 05' },
    });

// ─── GET /api/issues ──────────────────────────────────────────────────────────
describe('GET /api/issues', () => {
    it('returns empty array when no issues exist', async () => {
        const res = await request(app).get('/api/issues');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns all issues', async () => {
        const { user } = await makeCitizen();
        await seedIssue(user._id);
        await seedIssue(user._id, { category: 'Road' });

        const res = await request(app).get('/api/issues');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('filters by kebele', async () => {
        const { user } = await makeCitizen();
        await seedIssue(user._id, { description: 'Issue in 05' });
        await IssueReport.create({
            citizenId: user._id,
            category: 'Waste',
            description: 'Issue in 07',
            location: { kebele: 'Kebele 07' },
        });

        const res = await request(app).get('/api/issues?kebele=Kebele 05');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].description).toBe('Issue in 05');
    });

    it('sorts by urgency when sort=urgent', async () => {
        const { user } = await makeCitizen();
        await seedIssue(user._id, { description: 'Low urgency', urgencyCount: 1 });
        await seedIssue(user._id, { description: 'High urgency', urgencyCount: 10 });

        const res = await request(app).get('/api/issues?sort=urgent');
        expect(res.statusCode).toBe(200);
        expect(res.body[0].description).toBe('High urgency');
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
        expect(res.body.assignedAdminId).toBe(admin._id.toString());
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
        const { user } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app).get(`/api/issues/${issue._id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.issue._id).toBe(issue._id.toString());
        expect(res.body.comments).toEqual([]);
    });

    it('returns 404 for a nonexistent issue', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/issues/${fakeId}`);
        expect(res.statusCode).toBe(404);
    });
});

// ─── POST /api/issues/:id/vote ────────────────────────────────────────────────
describe('POST /api/issues/:id/vote', () => {
    it('citizen can vote on an issue (action=voted)', async () => {
        const { user: citizen, token } = await makeCitizen();
        const issue = await seedIssue(citizen._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/vote`)
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.action).toBe('voted');
        expect(res.body.urgencyCount).toBe(1);
    });

    it('second vote by same citizen removes vote (action=unvoted)', async () => {
        const { user: citizen, token } = await makeCitizen();
        const issue = await seedIssue(citizen._id);

        await request(app)
            .post(`/api/issues/${issue._id}/vote`)
            .set('Authorization', token);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/vote`)
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body.action).toBe('unvoted');
        expect(res.body.urgencyCount).toBe(0);
    });

    it('returns 404 for nonexistent issue', async () => {
        const { token } = await makeCitizen();
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post(`/api/issues/${fakeId}/vote`)
            .set('Authorization', token);
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 when not authenticated', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user._id);
        const res = await request(app).post(`/api/issues/${issue._id}/vote`);
        expect(res.statusCode).toBe(401);
    });
});

// ─── POST /api/issues/:id/comments ───────────────────────────────────────────
describe('POST /api/issues/:id/comments', () => {
    it('adds a comment to an issue', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/comments`)
            .set('Authorization', token)
            .send({ text: 'This needs urgent attention!' });

        expect(res.statusCode).toBe(201);
        expect(res.body.text).toBe('This needs urgent attention!');
        expect(res.body.issueId).toBe(issue._id.toString());
    });

    it('returns 422 if comment text is empty', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/comments`)
            .set('Authorization', token)
            .send({ text: '' });

        expect(res.statusCode).toBe(422);
    });

    it('returns 401 when unauthenticated', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/comments`)
            .send({ text: 'Anonymous comment' });

        expect(res.statusCode).toBe(401);
    });

    it('returns 404 when issue does not exist', async () => {
        const { token } = await makeCitizen();
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .post(`/api/issues/${fakeId}/comments`)
            .set('Authorization', token)
            .send({ text: 'Ghost comment' });

        expect(res.statusCode).toBe(404);
    });
});

// ─── POST /api/issues/:id/report ─────────────────────────────────────────────
describe('POST /api/issues/:id/report', () => {
    it('flags an issue with a reason', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/report`)
            .set('Authorization', token)
            .send({ reason: 'Spam content' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toMatch(/reported for review/i);
    });

    it('returns 422 if reason is missing', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/report`)
            .set('Authorization', token)
            .send({});

        expect(res.statusCode).toBe(422);
    });

    it('returns 404 for nonexistent issue', async () => {
        const { token } = await makeCitizen();
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .post(`/api/issues/${fakeId}/report`)
            .set('Authorization', token)
            .send({ reason: 'Inappropriate' });

        expect(res.statusCode).toBe(404);
    });
});

// ─── GET /api/issues/mine ─────────────────────────────────────────────────────
describe('GET /api/issues/mine', () => {
    it("returns only the authenticated citizen's own issues", async () => {
        const { user: citizen1, token: token1 } = await makeCitizen();
        const { user: citizen2 } = await makeCitizen();

        await seedIssue(citizen1._id, { description: 'Mine' });
        await seedIssue(citizen2._id, { description: 'Not mine' });

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
        const issue = await seedIssue(user._id, { status: 'Resolved' });

        const res = await request(app)
            .post(`/api/issues/${issue._id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 4, comment: 'Fixed quickly!' });

        expect(res.statusCode).toBe(201);
        expect(res.body.rating).toBe(4);
        expect(res.body.comment).toBe('Fixed quickly!');
    });

    it('second submission updates the existing feedback (upsert)', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user._id, { status: 'Resolved' });

        await request(app)
            .post(`/api/issues/${issue._id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 2 });

        const res = await request(app)
            .post(`/api/issues/${issue._id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 5, comment: 'Much better now!' });

        expect(res.statusCode).toBe(201);
        expect(res.body.rating).toBe(5);
    });

    it('returns 422 for rating out of range', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/feedback`)
            .set('Authorization', token)
            .send({ rating: 6 });

        expect(res.statusCode).toBe(422);
    });

    it('returns 422 when rating is missing', async () => {
        const { user, token } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/feedback`)
            .set('Authorization', token)
            .send({ comment: 'No rating provided' });

        expect(res.statusCode).toBe(422);
    });

    it('returns 404 for a nonexistent issue', async () => {
        const { token } = await makeCitizen();
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .post(`/api/issues/${fakeId}/feedback`)
            .set('Authorization', token)
            .send({ rating: 3 });

        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without auth token', async () => {
        const { user } = await makeCitizen();
        const issue = await seedIssue(user._id);

        const res = await request(app)
            .post(`/api/issues/${issue._id}/feedback`)
            .send({ rating: 4 });

        expect(res.statusCode).toBe(401);
    });
});
