// Backfill existing jobs and resumes into the AI queue (AI spec §18.2).
// Usage: npm run ai:backfill [-- --force] [-- --limit N]
// Processing happens in the running API process — the server must be running.

require('dotenv').config({ quiet: true });

const prisma = require('../src/config/db');
const redis = require('../src/config/redis');
const { aiConfig } = require('../src/ai/config');
const { aiQueue, enqueueJobProcessing, enqueueResumeProcessing } = require('../src/queues/ai.queue');

function parseArgs(argv) {
  const force = argv.includes('--force');
  const idx = argv.indexOf('--limit');
  const parsed = idx !== -1 ? parseInt(argv[idx + 1], 10) : NaN;
  const limit = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  return { force, limit };
}

async function main() {
  const { force, limit } = parseArgs(process.argv.slice(2));

  if (!aiConfig.active) {
    console.log('AI is not active (AI_ENABLED=false or no GEMINI_API_KEY). Nothing to backfill.');
    return;
  }

  const jobWhere = {
    isDeleted: false,
    AND: [{ OR: [{ deadline: null }, { deadline: { gte: new Date() } }] }],
  };
  if (!force) {
    jobWhere.AND.push({
      OR: [
        { insight: { is: null } },
        { insight: { is: { status: { not: 'READY' } } } },
      ],
    });
  }

  const jobs = await prisma.job.findMany({
    where: jobWhere,
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    ...(limit ? { take: limit } : {}),
  });

  let enqueuedJobs = 0;
  let failedJobs = 0;
  for (const job of jobs) {
    if (await enqueueJobProcessing(job.id, { force })) enqueuedJobs += 1;
    else failedJobs += 1;
  }

  const resumes = await prisma.resume.findMany({
    where: force ? {} : { status: { not: 'READY' } },
    select: { userId: true },
    ...(limit ? { take: limit } : {}),
  });

  let enqueuedResumes = 0;
  let failedResumes = 0;
  for (const resume of resumes) {
    if (await enqueueResumeProcessing(resume.userId)) enqueuedResumes += 1;
    else failedResumes += 1;
  }

  console.log(`[AI Backfill] ${enqueuedJobs} job(s) enqueued (${failedJobs} failed, ${jobs.length} candidate(s)${force ? ', --force' : ''})`);
  console.log(`[AI Backfill] ${enqueuedResumes} resume(s) enqueued (${failedResumes} failed, ${resumes.length} candidate(s))`);
  console.log('[AI Backfill] Processing happens in the running API process — keep the server running. The worker rate-limits itself and pauses on Gemini 429s.');
}

main()
  .catch((err) => {
    console.error('[AI Backfill] Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await aiQueue?.close(); } catch { /* already closed */ }
    try { await redis.quit(); } catch { /* already closed */ }
    try { await prisma.$disconnect(); } catch { /* ignore */ }
  });
