const nodemailer = require('nodemailer');

// In a real application, you would use SendGrid, Mailgun, or standard SMTP credentials from environment variables.
// For demonstration, we'll configure a basic transporter or Ethereal test account if credentials are not provided.
let transporter;

const initializeTransporter = async () => {
    if (!transporter) {
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            transporter = nodemailer.createTransport({
                service: 'gmail', // or your preferred service
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        } else {
            // Fallback to ethereal for testing
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user, // generated ethereal user
                    pass: testAccount.pass, // generated ethereal password
                },
            });
            console.warn('======================================================');
            console.warn('[EmailService] WARNING: No SMTP credentials found in .env');
            console.warn('[EmailService] Using Ethereal dummy account for testing.');
            console.warn('[EmailService] Emails will NOT be delivered to real inboxes.');
            console.warn('======================================================');
        }
    }
    return transporter;
};

/**
 * Sends the technician account credentials email.
 * @param {Object} technician - The technician user object
 * @param {string} username - The generated username
 * @param {string} rawPassword - The generated raw password
 */
const sendTechnicianCredentials = async (technician, username, rawPassword) => {
    try {
        const mail = await initializeTransporter();
        
        let specDisplay = 'None';
        if (Array.isArray(technician.specialization) && technician.specialization.length > 0) {
            specDisplay = technician.specialization.join(', ');
        } else if (typeof technician.specialization === 'string') {
            specDisplay = technician.specialization;
        }

        const loginUrl = process.env.TECHNICIAN_APP_URL || 'https://cityfix-technician.app';

        const mailOptions = {
            from: '"CityFix Administration" <noreply@cityfix.com>',
            to: technician.email,
            subject: 'CityFix Technician Account Credentials',
            text: `Hello ${technician.fullName},

Your CityFix technician account has been created.

Category: ${technician.department || 'N/A'}
Specialization: ${specDisplay}

Credentials:
Username: ${username}
Password: ${rawPassword}

Login URL: ${loginUrl}

Regards,
CityFix Administration`,
        };

        const info = await mail.sendMail(mailOptions);
        console.log('[EmailService] Credentials email sent to:', technician.email);
        
        // If using Ethereal, log the preview URL
        if (info.messageId && !process.env.SMTP_USER) {
            console.log('======================================================');
            console.log('[EmailService] 📧 EMAIL PREVIEW URL:');
            console.log(nodemailer.getTestMessageUrl(info));
            console.log('======================================================');
        }
        
        return true;
    } catch (err) {
        console.error('[EmailService] Failed to send credentials email:', err);
        return false;
    }
};

module.exports = {
    sendTechnicianCredentials,
};
