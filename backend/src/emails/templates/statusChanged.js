/**
 * Email template for application status change notification
 * Sent to applicants when employer updates their application status
 */
const statusChangedTemplate = ({ applicantName, jobTitle, newStatus }) => {
  const statusColors = {
    APPLIED: '#3b82f6',
    REVIEWING: '#f59e0b',
    INTERVIEW: '#8b5cf6',
    OFFERED: '#10b981',
    REJECTED: '#ef4444'
  };

  const statusLabels = {
    APPLIED: 'Applied',
    REVIEWING: 'Under Review',
    INTERVIEW: 'Interview Stage',
    OFFERED: 'Offer Extended',
    REJECTED: 'Not Selected'
  };

  const statusColor = statusColors[newStatus] || '#6b7280';
  const statusLabel = statusLabels[newStatus] || newStatus;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Updated</title>
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
    .status-box {
      background-color: #f9fafb;
      border-left: 4px solid ${statusColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .status-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .status-value {
      font-size: 20px;
      font-weight: 600;
      color: ${statusColor};
    }
    .job-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 10px;
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
      <h1>Application Status Updated</h1>
    </div>
    <div class="content">
      <p class="greeting">Hi ${applicantName},</p>
      
      <p>Good news! There's been an update to your application for the following position:</p>
      
      <div class="job-title">${jobTitle}</div>
      
      <div class="status-box">
        <div class="status-label">Current Status</div>
        <div class="status-value">${statusLabel}</div>
      </div>
      
      <p>Please log in to your account to view more details and track your application progress.</p>
      
      <p>Best regards,<br>The Anvil Team</p>
    </div>
    <div class="footer">
      <p>You received this email because you applied for a job on our platform.</p>
      <p>&copy; ${new Date().getFullYear()} Anvil. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

module.exports = statusChangedTemplate;
