const nodemailer = require('nodemailer');

// Note: For development, use Mailtrap (https://mailtrap.io) for email testing
// For production, switch to Gmail SMTP or your preferred email service
// To use Gmail: enable 2FA, create an App Password, and use it as SMTP_PASS
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail
};
