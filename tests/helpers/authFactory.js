/**
 * Creates test users in the DB and generates fake auth tokens.
 * The firebase-admin module is mocked globally via __mocks__.
 */
const User = require('../../src/models/User');

let _counter = 0;

const makeUser = async (overrides = {}) => {
    const uid = `test-uid-${++_counter}`;
    const user = await User.create({
        firebaseUid: uid,
        email: `user${_counter}@test.com`,
        fullName: overrides.fullName || `Test User ${_counter}`,
        role: overrides.role || 'CITIZEN',
        department: overrides.department,
    });
    // Token format understood by our firebase mock: "Bearer <uid>"
    const token = `Bearer ${uid}`;
    return { user, token };
};

const makeCitizen = (overrides = {}) =>
    makeUser({ role: 'CITIZEN', ...overrides });

const makeSectorAdmin = (overrides = {}) =>
    makeUser({ role: 'SECTOR_ADMIN', department: overrides.department || 'Water', ...overrides });

const makeSuperAdmin = (overrides = {}) =>
    makeUser({ role: 'SUPER_ADMIN', ...overrides });

module.exports = { makeUser, makeCitizen, makeSectorAdmin, makeSuperAdmin };
