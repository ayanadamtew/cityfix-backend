const request = require('supertest');
const app = require('../src/app');
const db = require('./helpers/dbSetup');
const { makeCitizen } = require('./helpers/authFactory');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

// ─── POST /api/auth/register ──────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
    it('registers a new citizen successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', 'Bearer new-uid-citizen-1')
            .send({ fullName: 'Alice Tesfaye' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toMatch(/registered successfully/i);
        expect(res.body.user.fullName).toBe('Alice Tesfaye');
        expect(res.body.user.role).toBe('CITIZEN');
    });

    it('returns 200 and existing user if already registered', async () => {
        // Register once
        await request(app)
            .post('/api/auth/register')
            .set('Authorization', 'Bearer existing-uid')
            .send({ fullName: 'Bob' });

        // Register again with same token/uid
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', 'Bearer existing-uid')
            .send({ fullName: 'Bob' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/already registered/i);
    });

    it('registers a SECTOR_ADMIN with a valid department', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', 'Bearer sector-admin-uid')
            .send({ fullName: 'Carol Admin', role: 'SECTOR_ADMIN', department: 'Water' });

        expect(res.statusCode).toBe(201);
        expect(res.body.user.role).toBe('SECTOR_ADMIN');
        expect(res.body.user.department).toBe('Water');
    });

    it('returns 422 if SECTOR_ADMIN has no department', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', 'Bearer sector-nodept-uid')
            .send({ fullName: 'No Dept Admin', role: 'SECTOR_ADMIN' });

        expect(res.statusCode).toBe(422);
    });

    it('returns 422 if fullName is missing', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', 'Bearer missing-name-uid')
            .send({});

        expect(res.statusCode).toBe(422);
        expect(res.body.errors).toBeDefined();
    });

    it('returns 422 if role is invalid', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', 'Bearer invalid-role-uid')
            .send({ fullName: 'Hacker', role: 'HACKER' });

        expect(res.statusCode).toBe(422);
    });
});

// ─── GET /api/users/me ─────────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
    it('returns the authenticated user profile', async () => {
        const { user, token } = await makeCitizen({ fullName: 'Dave Test' });
        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', token);

        expect(res.statusCode).toBe(200);
        expect(res.body._id).toBe(user._id.toString());
        expect(res.body.fullName).toBe('Dave Test');
    });

    it('returns 401 without a token', async () => {
        const res = await request(app).get('/api/users/me');
        expect(res.statusCode).toBe(401);
    });

    it('returns 401 with a bad token (unregistered uid)', async () => {
        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', 'Bearer unregistered-uid-xyz');
        expect(res.statusCode).toBe(401);
    });
});
