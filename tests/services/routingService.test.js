const mongoose = require('mongoose');
const db = require('../helpers/dbSetup');
const { makeCitizen, makeSectorAdmin } = require('../helpers/authFactory');
const { findAdminByCategory } = require('../../src/services/routingService');

jest.mock('firebase-admin');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

describe('routingService – findAdminByCategory', () => {
    it('returns matching sector admin ObjectId for the given category', async () => {
        const { user: admin } = await makeSectorAdmin({ department: 'Road' });
        const result = await findAdminByCategory('Road');
        expect(result.toString()).toBe(admin._id.toString());
    });

    it('returns null when no admin for category exists', async () => {
        const result = await findAdminByCategory('Electricity');
        expect(result).toBeNull();
    });

    it('does not return an admin for a different category', async () => {
        await makeSectorAdmin({ department: 'Water' });
        const result = await findAdminByCategory('Waste');
        expect(result).toBeNull();
    });

    it('returns only SECTOR_ADMIN, not CITIZEN matching by name', async () => {
        // Citizen whose name happens to match won't be returned
        await makeCitizen({ department: undefined });
        const result = await findAdminByCategory('Road');
        expect(result).toBeNull();
    });
});
