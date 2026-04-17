const { sendResolutionNotification } = require('../../src/services/notificationService');

jest.mock('firebase-admin', () => {
    const mockSend = jest.fn();
    return {
        credential: { cert: jest.fn() },
        initializeApp: jest.fn(),
        messaging: jest.fn(() => ({
            send: mockSend
        }))
    };
});

jest.mock('../../src/models', () => {
    return {
        User: {
            findByPk: jest.fn()
        }
    };
});

const { admin } = require('../../src/config/firebase');

describe('Notification Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockIssue = {
        id: 'issueId123',
        citizenId: 'citizenId123',
        category: 'Pothole'
    };

    it('should silently skip if citizen is not found (deleted)', async () => {
        require('../../src/models').User.findByPk.mockResolvedValue(null);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await sendResolutionNotification(mockIssue);

        expect(require('../../src/models').User.findByPk).toHaveBeenCalledWith('citizenId123', { attributes: ['id', 'fcmToken', 'fullName'] });
        expect(admin.messaging().send).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should silently skip if citizen has no FCM token', async () => {
        require('../../src/models').User.findByPk.mockResolvedValue({ id: 'citizenId123', fcmToken: null });

        await sendResolutionNotification(mockIssue);
        expect(admin.messaging().send).not.toHaveBeenCalled();
    });

    it('should send push notification via admin.messaging if fcmToken exists', async () => {
        require('../../src/models').User.findByPk.mockResolvedValue({ id: 'citizenId123', fcmToken: 'valid-token' });
        admin.messaging().send.mockResolvedValue('messageId123');

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendResolutionNotification(mockIssue);

        expect(admin.messaging().send).toHaveBeenCalledWith({
            token: 'valid-token',
            notification: {
                title: '✅ Issue Resolved',
                body: 'Your Pothole report has been resolved. Tap to rate the service.',
            },
            data: {
                issueId: 'issueId123',
                screen: 'MyReports',
            },
        });
        consoleSpy.mockRestore();
    });

    it('should catch and log errors securely without throwing', async () => {
        require('../../src/models').User.findByPk.mockResolvedValue({ id: 'citizenId123', fcmToken: 'valid-token' });
        admin.messaging().send.mockRejectedValue(new Error('Firebase Error'));

        // Silence console.error for clean test output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(sendResolutionNotification(mockIssue)).resolves.toBeUndefined();
        
        expect(consoleSpy).toHaveBeenCalledWith('[Notification] Failed to send push notification:', 'Firebase Error');
        consoleSpy.mockRestore();
    });
});
