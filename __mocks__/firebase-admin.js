/**
 * Manual Jest mock for firebase-admin.
 *
 * verifyIdToken interprets the token as the raw firebase UID
 * (our authFactory passes that as the Bearer value).
 */
const admin = {
    apps: [true], // Pretend already initialized
    initializeApp: jest.fn(),
    credential: {
        cert: jest.fn(),
    },
    auth: () => ({
        verifyIdToken: jest.fn(async (token) => ({
            uid: token,         // token === uid in tests
            email: `${token}@test.com`,
        })),
    }),
};

module.exports = admin;
