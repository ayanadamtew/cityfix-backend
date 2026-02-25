const request = require('supertest');
const app = require('../src/app');
const db = require('./helpers/dbSetup');

beforeAll(() => db.connect());
afterAll(() => db.closeDatabase());

describe('GET /health', () => {
    it('returns status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ status: 'ok', service: 'CityFix API' });
    });
});

describe('404 fallback', () => {
    it('returns 404 for unknown routes', async () => {
        const res = await request(app).get('/api/nonexistent');
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });
});
