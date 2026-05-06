const nodemailer = require('nodemailer');

// In a real application, you would use SendGrid, Mailgun, or standard SMTP credentials from environment variables.
// For demonstration, we'll configure a basic transporter or Ethereal test account if credentials are not provided.
let transporter;

const initializeTransporter = async () => {
    if (!transporter) {
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log(`[EmailService] Initializing SMTP for ${process.env.SMTP_USER}`);
            transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // TLS
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false
                }
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


        const specBadges = (() => {
            if (!Array.isArray(technician.specialization) || technician.specialization.length === 0) return '';
            return technician.specialization
                .map(s => `<span style="display:inline-block;background:#e8f5e9;color:#2e7d32;border:1px solid #c8e6c9;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;margin:3px 4px 3px 0;">${s}</span>`)
                .join('');
        })();

        const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>CityFix — Your Account is Ready</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 50%,#388e3c 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
            <div style="display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.15);border-radius:12px;width:56px;height:56px;margin-bottom:16px;">
              <span style="font-size:28px;">🔧</span>
            </div>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Welcome to CityFix</h1>
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:15px;">Your technician account has been created</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">

            <!-- Greeting -->
            <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
              Hello, <strong style="color:#1b5e20;">${technician.fullName}</strong>! 👋<br/>
              Your CityFix technician account has been set up and is ready to use. Below are your login credentials — please keep them safe.
            </p>

            <!-- Profile Card -->
            <div style="background:#f8fdf8;border:1px solid #c8e6c9;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Your Profile</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Department</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${technician.department || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;vertical-align:top;">Specializations</td>
                  <td style="padding:6px 0;">${specBadges || '<span style="font-size:14px;color:#111827;font-weight:600;">None assigned</span>'}</td>
                </tr>
              </table>
            </div>

            <!-- Credentials Card -->
            <div style="background:#1b5e20;border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">🔑 Login Credentials</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 16px;background:rgba(255,255,255,0.1);border-radius:8px 8px 0 0;border-bottom:1px solid rgba(255,255,255,0.1);">
                    <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.8px;">Username</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;font-family:'Courier New',monospace;letter-spacing:1px;">${username}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;background:rgba(255,255,255,0.1);border-radius:0 0 8px 8px;">
                    <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.8px;">Temporary Password</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#a5d6a7;font-family:'Courier New',monospace;letter-spacing:2px;">${rawPassword}</p>
                  </td>
                </tr>
              </table>
            </div>


            <!-- Security Notice -->
            <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
              <p style="margin:0;font-size:13px;color:#7a5a00;line-height:1.6;">
                ⚠️ <strong>Security Notice:</strong> This is a temporary password. You will be prompted to change it upon first login. Do not share your credentials with anyone.
              </p>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fdf8;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">If you did not expect this email, please contact your administrator.</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} CityFix · Municipal Issue Tracking Platform</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const mailOptions = {
            from: `"CityFix Administration" <${process.env.SMTP_USER}>`,
            to: technician.email,
            subject: '🔧 Your CityFix Technician Account is Ready',
            html: htmlBody,
            text: `Hello ${technician.fullName},\n\nYour CityFix technician account has been created.\n\nDepartment: ${technician.department || 'N/A'}\nSpecializations: ${specDisplay}\n\nUsername: ${username}\nPassword: ${rawPassword}\n\nRegards,\nCityFix Administration`,
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
