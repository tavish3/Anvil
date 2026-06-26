/**
 * Email template for new application notification
 * Sent to employers when an applicant applies to their job listing
 */
const newApplicationTemplate = ({ employerName, jobTitle, applicantName }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Application Received</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .info-box {
      background-color: #f9fafb;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .info-value {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    .job-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .cta-button {
      display: inline-block;
      background-color: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
    }
    .cta-button:hover {
      background-color: #5568d3;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Application Received</h1>
    </div>
    <div class="content">
      <p class="greeting">Hi ${employerName},</p>
      
      <p>Great news! You have received a new application for your job posting:</p>
      
      <div class="job-title">${jobTitle}</div>
      
      <div class="info-box">
        <div class="info-label">Applicant Name</div>
        <div class="info-value">${applicantName}</div>
      </div>
      
      <p>Please log in to your employer dashboard to review the applicant's resume and cover letter, and to manage your application pipeline.</p>
      
      <p>Best regards,<br>The Anvil Team</p>
    </div>
    <div class="footer">
      <p>You received this email because you posted a job on our platform.</p>
      <p>&copy; ${new Date().getFullYear()} Anvil. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

module.exports = newApplicationTemplate;
