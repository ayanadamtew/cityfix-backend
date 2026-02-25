const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const db = require('./helpers/dbSetup');
const { makeCitizen, makeSectorAdmin, makeSuperAdmin } = require('./helpers/authFactory');
const IssueReport = require('../src/models/IssueReport');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

const seedIssue = (citizenId, assignedAdminId, overrides = {}) =>
    IssueReport.create({
        citizenId,
        assignedAdminId: assignedAdminId || null,
        category: overrides.category || 'Water',
        description: overrides.description || 'Admin issue',
        status: overrides.status || 'Pending',
    });

// ─── GET /api/admin/issues ────────────────────────────────────────────────────
describe('GET /api/admin/issues', () => {
    it('returns only assigned issues for SECTOR_ADMIN', async () => {
        const { user: admin, token } = await makeSectorAdmin({ department: 'Water' });
        const { user: citizen } = await makeCitizen();
        const { user: otherAdmin } = await makeSectorAdmin({ department: 'Road' });

        await seedIssue(citizen._id, admin._id);           // assigned to our admin
        await seedIssue(citizen._id, otherAdmin._id);      // assigned to other admin
        await seedIssue(citizen._id, null);                // unassigned

        const res = await request(app)
            .get('/api/admin/issues')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].assignedAdminId._id).toBe(admin._id.toString());
    });

    it('returns all issues for SUPER_ADMIN', async () => {
        const { token } = await makeSuperAdmin();
        const { user: citizen } = await makeCitizen();
        const { user: admin } = await makeSectorAdmin({ department: 'Waste' });

        await seedIssue(citizen._id, admin._id);
        await seedIssue(citizen._id, null);

        const res = await request(app)
            .get('/api/admin/issues')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('returns 403 for CITIZEN role', async () => {
        const { token } = await makeCitizen();
        const res = await request(app)
            .get('/api/admin/issues')
            .set('Authorization', token);
        expect(res.statusCode).toBe(403);
    });

    it('returns 401 without auth', async () => {
        const res = await request(app).get('/api/admin/issues');
        expect(res.statusCode).toBe(401);
    });
});

// ─── PUT /api/admin/issues/:id/status ────────────────────────────────────────
describe('PUT /api/admin/issues/:id/status', () => {
    it('SECTOR_ADMIN can update status of their own issue', async () => {
        const { user: admin, token } = await makeSectorAdmin({ department: 'Road' });
        const { user: citizen } = await makeCitizen();
        const issue = await seedIssue(citizen._id, admin._id);

        const res = await request(app)
            .put(`/api/admin/issues/${issue._id}/status`)
            .set('Authorization', token)
            .send({ status: 'In Progress' });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('In Progress');
    });

    it('SUPER_ADMIN can update any issue status', async () => {
        const { token } = await makeSuperAdmin();
        const { user: citizen } = await makeCitizen();
        const { user: admin } = await makeSectorAdmin({ department: 'Electricity' });
        const issue = await seedIssue(citizen._id, admin._id);

        const res = await request(app)
            .put(`/api/admin/issues/${issue._id}/status`)
            .set('Authorization', token)
            .send({ status: 'Resolved' });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('Resolved');
    });

    it('SECTOR_ADMIN cannot update an issue not assigned to them', async () => {
        const { token } = await makeSectorAdmin({ department: 'Water' });
        const { user: citizen } = await makeCitizen();
        const { user: otherAdmin } = await makeSectorAdmin({ department: 'Waste' });
        const issue = await seedIssue(citizen._id, otherAdmin._id);

        const res = await request(app)
            .put(`/api/admin/issues/${issue._id}/status`)
            .set('Authorization', token)
            .send({ status: 'In Progress' });

        expect(res.statusCode).toBe(404);
    });

    it('returns 422 for invalid status value', async () => {
        const { user: admin, token } = await makeSectorAdmin({ department: 'Water' });
        const { user: citizen } = await makeCitizen();
        const issue = await seedIssue(citizen._id, admin._id);

        const res = await request(app)
            .put(`/api/admin/issues/${issue._id}/status`)
            .set('Authorization', token)
            .send({ status: 'Foo' });

        expect(res.statusCode).toBe(422);
    });

    it('returns 403 for CITIZEN role', async () => {
        const { token } = await makeCitizen();
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .put(`/api/admin/issues/${fakeId}/status`)
            .set('Authorization', token)
            .send({ status: 'In Progress' });
        expect(res.statusCode).toBe(403);
    });
});

// ─── GET /api/admin/analytics ─────────────────────────────────────────────────
describe('GET /api/admin/analytics', () => {
    it('SUPER_ADMIN gets analytics with correct shape', async () => {
        const { token } = await makeSuperAdmin();
        const { user: citizen } = await makeCitizen();

        await seedIssue(citizen._id, null, { category: 'Water', status: 'Pending' });
        await seedIssue(citizen._id, null, { category: 'Road', status: 'Resolved' });

        const res = await request(app)
            .get('/api/admin/analytics')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('byStatus');
        expect(res.body).toHaveProperty('byCategory');
        expect(res.body).toHaveProperty('topUrgentIssues');
        expect(res.body.byCategory.Water).toBe(1);
        expect(res.body.byCategory.Road).toBe(1);
    });

    it('returns 403 for SECTOR_ADMIN', async () => {
        const { token } = await makeSectorAdmin();
        const res = await request(app)
            .get('/api/admin/analytics')
            .set('Authorization', token);
        expect(res.statusCode).toBe(403);
    });

    it('returns 403 for CITIZEN', async () => {
        const { token } = await makeCitizen();
        const res = await request(app)
            .get('/api/admin/analytics')
            .set('Authorization', token);
        expect(res.statusCode).toBe(403);
    });
});
