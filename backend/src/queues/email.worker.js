const { Worker } = require('bullmq');
const redis = require('../config/redis');
const { sendEmail } = require('../emails/mailer');
const statusChangedTemplate = require('../emails/templates/statusChanged');
const newApplicationTemplate = require('../emails/templates/newApplication');

const emailWorker = new Worker('email', async (job) => {
  const { name, data } = job;

  try {
    if (name === 'status-changed') {
      const { applicantEmail, applicantName, jobTitle, newStatus } = data;
      
      const html = statusChangedTemplate({
        applicantName,
        jobTitle,
        newStatus
      });

      await sendEmail(
        applicantEmail,
        `Application Status Updated: ${jobTitle}`,
        html
      );

      console.log(`[Email Worker] Status change email sent to ${applicantEmail}`);
    } 
    else if (name === 'new-application') {
      const { employerEmail, employerName, jobTitle, applicantName } = data;
      
      const html = newApplicationTemplate({
        employerName,
        jobTitle,
        applicantName
      });

      await sendEmail(
        employerEmail,
        `New Application Received: ${jobTitle}`,
        html
      );

      console.log(`[Email Worker] New application email sent to ${employerEmail}`);
    }
  } catch (error) {
    console.error(`[Email Worker] Failed to process job ${job.id}:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 60000 // 10 emails per minute max
  },
  // Retry configuration: 3 attempts with exponential backoff
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000 // Base delay of 5 seconds
  }
});

emailWorker.on('completed', (job) => {
  console.log(`[Email Worker] Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Email Worker] Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Email Worker] SIGTERM received, closing worker...');
  await emailWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Email Worker] SIGINT received, closing worker...');
  await emailWorker.close();
  process.exit(0);
});

module.exports = emailWorker;
