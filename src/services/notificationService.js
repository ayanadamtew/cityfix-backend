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
 * Notify the sector admin when a technician submits completion proof.
 */
const sendCompletionNotification = async (assignment, proof) => {
    try {
        // Find the admin who assigned this task
        const assigner = await User.findByPk(assignment.assignedById, {
            attributes: ['id', 'fcmToken', 'fullName'],
        });
        if (!assigner?.fcmToken) return;

        const { IssueReport } = require('../models');
        const issue = await IssueReport.findByPk(assignment.issueId);

        const message = {
            token: assigner.fcmToken,
            notification: {
                title: '📋 Proof Submitted for Review',
                body: `A technician has submitted completion proof for a ${issue?.category || ''} issue.`,
            },
            data: {
                proofId: proof.id.toString(),
                assignmentId: assignment.id.toString(),
                screen: 'Verification',
            },
        };

        await admin.messaging().send(message);
        console.log(`[Notification] Sent completion notification to admin ${assigner.id}`);
    } catch (err) {
        console.error('[Notification] Failed to send completion notification:', err.message);
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
            'Resolved': '✅ Issue Resolved',
        };

        const bodies = {
            'Approved': `Your ${issue.category} report has been reviewed and approved.`,
            'Assigned': `A technician has been assigned to your ${issue.category} report.`,
            'In Progress': `Work has started on your ${issue.category} report.`,
            'Resolved': `Your ${issue.category} report has been resolved. Tap to rate the service.`,
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
    sendCompletionNotification,
    sendStatusUpdateNotification,
};
