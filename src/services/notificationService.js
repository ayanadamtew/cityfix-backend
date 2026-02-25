const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * Send a push notification to the citizen when their issue is resolved.
 * Gracefully no-ops if the citizen has no FCM token stored.
 *
 * @param {import('../models/IssueReport')} issue - The resolved IssueReport document
 */
const sendResolutionNotification = async (issue) => {
    try {
        const citizen = await User.findById(issue.citizenId).select('fcmToken fullName');
        if (!citizen?.fcmToken) {
            // Citizen hasn't granted push permission yet – skip silently
            return;
        }

        const message = {
            token: citizen.fcmToken,
            notification: {
                title: '✅ Issue Resolved',
                body: `Your ${issue.category} report has been resolved. Tap to rate the service.`,
            },
            data: {
                issueId: issue._id.toString(),
                screen: 'MyReports',
            },
        };

        await admin.messaging().send(message);
        console.log(`[Notification] Sent resolution push to citizen ${citizen._id}`);
    } catch (err) {
        // Never let a failed push break the status-update response
        console.error('[Notification] Failed to send push notification:', err.message);
    }
};

module.exports = { sendResolutionNotification };
