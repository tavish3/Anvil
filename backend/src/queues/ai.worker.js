const { Worker } = require('bullmq');
const prisma = require('../config/db');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');
const { aiConfig } = require('../ai/config');
const { QUEUE_NAME, JOB_NAMES, WORKER_RATE_LIMIT_PAUSE_MS } = require('../ai/constants');
const { isRateLimitError, getRetryDelayMs } = require('../ai/errors');
const { buildJobDocument, buildResumeEmbeddingText, truncate } = require('../ai/text');
const { embedDocument, embedQuery } = require('../ai/embeddings');
const { jobContentHash, shouldSkipJobProcessing } = require('../ai/processing');
const { generateJobInsights } = require('../ai/chains/jobInsights.chain');
const { extractResumeProfile } = require('../ai/chains/resumeProfile.chain');
const repository = require('../ai/repository');

// process-job { jobId, force }: insights + document-role embedding, stored atomically.
async function processJob({ jobId, force = false }) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { employer: { select: { name: true } } },
  });
  if (!job || job.isDeleted) {
    console.log(`[AI Worker] process-job ${jobId}: job missing or deleted, skipping`);
    return;
  }

  const document = buildJobDocument(job, job.employer?.name);
  const contentHash = jobContentHash(document);

  const insight = await prisma.jobInsight.findUnique({ where: { jobId } });
  const hasEmbedding = await repository.hasJobEmbedding(jobId);
  if (shouldSkipJobProcessing({ force, insight, contentHash, hasEmbedding })) {
    console.log(`[AI Worker] process-job ${jobId}: unchanged, skipping`);
    return;
  }

  const [insights, vector] = await Promise.all([
    generateJobInsights(document),
    embedDocument(document, { title: job.title }),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.jobInsight.upsert({
      where: { jobId },
      create: {
        jobId,
        summary: insights.summary,
        highlights: insights.highlights,
        contentHash,
        status: 'READY',
        error: null,
        processedAt: new Date(),
      },
      update: {
        summary: insights.summary,
        highlights: insights.highlights,
        contentHash,
        status: 'READY',
        error: null,
        processedAt: new Date(),
      },
    });
    await repository.setJobEmbedding(tx, jobId, vector);
  });
  console.log(`[AI Worker] process-job ${jobId}: READY`);
}

// process-resume { userId }: structured profile + query-role embedding (the resume vector is
// later used as the query against job vectors; it is never cached in Redis).
async function processResume({ userId }) {
  const resume = await prisma.resume.findUnique({ where: { userId } });
  if (!resume) {
    console.log(`[AI Worker] process-resume: no resume for user, skipping`);
    return;
  }

  const profile = await extractResumeProfile(resume.text);
  const vector = await embedQuery(buildResumeEmbeddingText(profile, resume.text), { cache: false });

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.resume.updateMany({
      where: { userId, textHash: resume.textHash },
      data: { profile, status: 'READY', error: null, processedAt: new Date() },
    });
    if (count === 0) {
      // The user replaced the resume while we were processing; the newer upload wins.
      console.log(`[AI Worker] process-resume ${userId}: resume replaced meanwhile, skipping embedding`);
      return;
    }
    await repository.setResumeEmbedding(tx, userId, resume.textHash, vector);
  });
  console.log(`[AI Worker] process-resume ${userId}: READY`);
}

let worker = null;

if (aiConfig.active) {
  const processor = async (job) => {
    try {
      if (job.name === JOB_NAMES.PROCESS_JOB) {
        await processJob(job.data);
      } else if (job.name === JOB_NAMES.PROCESS_RESUME) {
        await processResume(job.data);
      }
    } catch (err) {
      if (isQuotaError(err)) {
        // Pause the whole queue and requeue WITHOUT consuming an attempt (verified BullMQ 5).
        await worker.rateLimit(Math.max(getRetryDelayMs(err) ?? 0, WORKER_RATE_LIMIT_PAUSE_MS));
        throw Worker.RateLimitError();
      }
      throw err;
    }
  };

  worker = new Worker(QUEUE_NAME, processor, {
    connection: redis,
    concurrency: aiConfig.workerConcurrency,
    limiter: { max: aiConfig.workerRatePerMinute, duration: 60000 },
  });

  worker.on('completed', (job) => {
    console.log(`[AI Worker] Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[AI Worker] Job ${job?.id} failed:`, err.message);
    const finalAttempt = job && job.attemptsMade >= (job.opts?.attempts ?? 1);
    if (!finalAttempt) return;
    try {
      const error = truncate(String(err?.message ?? 'Unknown error'), 300);
      if (job.name === JOB_NAMES.PROCESS_JOB) {
        await prisma.jobInsight.updateMany({
          where: { jobId: job.data?.jobId },
          data: { status: 'FAILED', error },
        });
      } else if (job.name === JOB_NAMES.PROCESS_RESUME) {
        await prisma.resume.updateMany({
          where: { userId: job.data?.userId, status: 'PENDING' },
          data: { status: 'FAILED', error },
        });
      }
    } catch (dbErr) {
      console.error('[AI Worker] Failed to record final failure:', dbErr.message);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('[AI Worker] SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[AI Worker] SIGINT received, closing worker...');
    await worker.close();
    process.exit(0);
  });
} else {
  console.log('[AI Worker] AI features disabled (no GEMINI_API_KEY)');
}

// The chains wrap provider errors with runAi(): a Gemini 429 arrives as
// ApiError(503, '...busy...'), while embeddings throw raw provider errors that
// isRateLimitError detects directly.
function isQuotaError(err) {
  return isRateLimitError(err) ||
    (err instanceof ApiError && err.statusCode === 503 && /busy/i.test(err.message));
}

module.exports = worker;
