const { admin } = require('../config/firebase');
const { User } = require('../models');

/**
 * Send a push notification to the citizen when their issue is resolved.
 * Gracefully no-ops if the citizen has no FCM token stored.
 *
 * @param {import('../models/IssueReport').default} issue - The resolved IssueReport instance
 */
const sendResolutionNotification = async (issue) => {
    try {
        const citizen = await User.findByPk(issue.citizenId, {
            attributes: ['id', 'fcmToken', 'fullName'],
        });
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
                issueId: issue.id.toString(),
                screen: 'MyReports',
            },
        };

        await admin.messaging().send(message);
        console.log(`[Notification] Sent resolution push to citizen ${citizen.id}`);
    } catch (err) {
        // Never let a failed push break the status-update response
        console.error('[Notification] Failed to send push notification:', err.message);
    }
};

/**
 * Notify a technician when they receive a new assignment.
 */
const sendAssignmentNotification = async (assignment, issue, technician) => {
    try {
        if (!technician?.fcmToken) return;

        const message = {
            token: technician.fcmToken,
            notification: {
                title: '🔧 New Task Assigned',
                body: `You have a new ${issue.category} task: ${issue.description.substring(0, 80)}...`,
            },
            data: {
                assignmentId: assignment.id.toString(),
                issueId: issue.id.toString(),
                screen: 'TaskDetail',
            },
        };

        await admin.messaging().send(message);
        console.log(`[Notification] Sent assignment push to technician ${technician.id}`);
    } catch (err) {
        console.error('[Notification] Failed to send assignment notification:', err.message);
    }
};

/**
 * Notify the citizen when a technician submits completion proof.
 */
const sendConfirmationRequestNotification = async (issue, proof) => {
    try {
        const citizen = await User.findByPk(issue.citizenId, {
            attributes: ['id', 'fcmToken', 'fullName'],
        });
        if (!citizen?.fcmToken) return;

        const message = {
            token: citizen.fcmToken,
            notification: {
                title: '✅ Resolution Confirmation Needed',
                body: `A technician has marked your ${issue?.category || ''} issue as resolved. Tap to confirm.`,
            },
            data: {
                proofId: proof.id.toString(),
                issueId: issue.id.toString(),
                screen: 'MyReports',
            },
        };

        await admin.messaging().send(message);
        console.log(`[Notification] Sent confirmation request notification to citizen ${citizen.id}`);
    } catch (err) {
        console.error('[Notification] Failed to send confirmation request notification:', err.message);
    }
};

/**
 * Notify the citizen about key status updates (Approved, Resolved).
 */
const sendStatusUpdateNotification = async (issue, newStatus) => {
    try {
        const citizen = await User.findByPk(issue.citizenId, {
            attributes: ['id', 'fcmToken', 'fullName'],
        });
        if (!citizen?.fcmToken) return;

        const titles = {
            'Approved': '👍 Report Approved',
            'Assigned': '🔧 Technician Assigned',
            'In Progress': '🔨 Work Started',
            'Waiting Confirmation': '✅ Resolution Confirmation Needed',
            'Resolved': '🎉 Issue Confirmed',
        };

        const bodies = {
            'Approved': `Your ${issue.category} report has been reviewed and approved.`,
            'Assigned': `A technician has been assigned to your ${issue.category} report.`,
            'In Progress': `Work has started on your ${issue.category} report.`,
            'Waiting Confirmation': `A technician marked your ${issue.category} report as fixed. Please confirm.`,
            'Resolved': `Your ${issue.category} report has been fully resolved. Tap to rate the service.`,
        };

        const title = titles[newStatus];
        const body = bodies[newStatus];

        if (!title) return; // We only notify on specific status changes

        const message = {
            token: citizen.fcmToken,
            notification: { title, body },
            data: {
                issueId: issue.id.toString(),
                screen: 'MyReports',
            },
        };

        await admin.messaging().send(message);
        console.log(`[Notification] Sent ${newStatus} notification to citizen ${citizen.id}`);
    } catch (err) {
        console.error('[Notification] Failed to send status update notification:', err.message);
    }
};

module.exports = {
    sendResolutionNotification,
    sendAssignmentNotification,
    sendConfirmationRequestNotification,
    sendStatusUpdateNotification,
};
