const { Queue } = require('bullmq');
const redis = require('../config/redis');
const prisma = require('../config/db');
const { aiConfig } = require('../ai/config');
const { QUEUE_NAME, JOB_NAMES } = require('../ai/constants');

// Created only when AI is active; otherwise null and the enqueue helpers are no-ops.
// Retry options are job options and belong on the Queue's defaultJobOptions (AI spec §9.1).
const aiQueue = aiConfig.active
  ? new Queue(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: { count: 200 },
      },
    })
  : null;

// Marks the JobInsight row PENDING (force resets a previous failure) and enqueues processing.
// Never throws: job CRUD must not fail because of AI.
async function enqueueJobProcessing(jobId, { force = false } = {}) {
  if (!aiQueue) return false;
  try {
    await prisma.jobInsight.upsert({
      where: { jobId },
      create: { jobId, status: 'PENDING' },
      update: force ? { status: 'PENDING', error: null } : {},
    });
    await aiQueue.add(JOB_NAMES.PROCESS_JOB, { jobId, force });
    return true;
  } catch (err) {
    console.error(`[AI Queue] Failed to enqueue job processing for ${jobId}:`, err.message);
    return false;
  }
}

// The resume service already set the row to PENDING; nothing is written here.
async function enqueueResumeProcessing(userId) {
  if (!aiQueue) return false;
  try {
    await aiQueue.add(JOB_NAMES.PROCESS_RESUME, { userId });
    return true;
  } catch (err) {
    console.error(`[AI Queue] Failed to enqueue resume processing for user ${userId}:`, err.message);
    return false;
  }
}

module.exports = { aiQueue, enqueueJobProcessing, enqueueResumeProcessing };
