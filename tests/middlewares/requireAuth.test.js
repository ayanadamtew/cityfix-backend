const request = require('supertest');
const app = require('../../src/app');
const db = require('../helpers/dbSetup');
const { makeCitizen } = require('../helpers/authFactory');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

describe('requireAuth middleware', () => {
    it('attaches user to req and calls next for valid token', async () => {
        const { token } = await makeCitizen();
        // /api/users/me is protected by requireAuth – 200 means middleware passed
        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', token);
        expect(res.statusCode).toBe(200);
    });

    it('returns 401 when Authorization header is missing', async () => {
        const res = await request(app).get('/api/users/me');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toMatch(/no token/i);
    });

    it('returns 401 when header does not start with Bearer', async () => {
        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', 'Basic abc123');
        expect(res.statusCode).toBe(401);
    });

    it('returns 401 for a valid JWT from Firebase but user not in DB', async () => {
        // Token uid "ghost-uid" won't match any DB user
        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', 'Bearer ghost-uid');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toMatch(/not registered/i);
    });
});
