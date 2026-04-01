const { sendResolutionNotification } = require('../../src/services/notificationService');
const User = require('../../src/models/User');
const { admin } = require('../../src/config/firebase');

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/config/firebase', () => ({
    admin: {
        messaging: jest.fn().mockReturnValue({
            send: jest.fn()
        })
    }
}));

describe('Notification Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockIssue = {
        _id: 'issueId123',
        citizenId: 'citizenId123',
        category: 'Pothole'
    };

    it('should silently skip if citizen is not found', async () => {
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        await sendResolutionNotification(mockIssue);

        expect(User.findById).toHaveBeenCalledWith('citizenId123');
        expect(admin.messaging().send).not.toHaveBeenCalled();
    });

    it('should silently skip if citizen has no FCM token', async () => {
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'citizenId123', fcmToken: null })
        });

        await sendResolutionNotification(mockIssue);

        expect(admin.messaging().send).not.toHaveBeenCalled();
    });

    it('should send push notification via admin.messaging if fcmToken exists', async () => {
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'citizenId123', fcmToken: 'valid-token' })
        });

        const sendMock = admin.messaging().send;
        sendMock.mockResolvedValue('messageId123');

        await sendResolutionNotification(mockIssue);

        expect(sendMock).toHaveBeenCalledWith({
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
    });

    it('should catch and log errors securely without throwing', async () => {
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'citizenId123', fcmToken: 'valid-token' })
        });

        const sendMock = admin.messaging().send;
        sendMock.mockRejectedValue(new Error('Firebase Error'));

        // Silence console.error for clean test output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(sendResolutionNotification(mockIssue)).resolves.toBeUndefined();
        
        expect(consoleSpy).toHaveBeenCalledWith('[Notification] Failed to send push notification:', 'Firebase Error');
        
        consoleSpy.mockRestore();
    });
});
