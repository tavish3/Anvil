const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { aiConfig } = require('../../ai/config');
const { SYNC_REQUEST_TIMEOUT_MS } = require('../../ai/constants');
const { runAi } = require('../../ai/errors');
const { parseSearchQuery } = require('../../ai/chains/searchParser.chain');
const { embedQuery } = require('../../ai/embeddings');
const { enqueueJobProcessing } = require('../../queues/ai.queue');
const { getJobEmbeddingText, findSimilarJobs, searchJobs: searchJobsRepo } = require('../../ai/repository');
const { mapJobRow } = require('./ai.mapper');

const getAiStatus = async () => ({ enabled: aiConfig.active });

// Endpoint #2 (§11.3): NONE when no JobInsight row exists; a PENDING/FAILED row may
// still carry the previous summary, which is returned as-is.
const getJobInsights = async (jobId) => {
  const job = await prisma.job.findFirst({
    where: { id: jobId, isDeleted: false },
    select: { id: true }
  });
  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  const insight = await prisma.jobInsight.findUnique({ where: { jobId } });
  if (!insight) {
    return { status: 'NONE', summary: null, highlights: null, processedAt: null };
  }

  return {
    status: insight.status,
    summary: insight.summary,
    highlights: insight.highlights ?? null,
    processedAt: insight.processedAt
  };
};

// Endpoint #3 (§11.3): employer-only regeneration of the AI summary.
const regenerateJobInsights = async (jobId, userId) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, employerId: true, isDeleted: true }
  });
  if (!job || job.isDeleted) {
    throw new ApiError(404, 'Job not found');
  }
  if (job.employerId !== userId) {
    throw new ApiError(403, "You do not have permission to regenerate this job's AI summary");
  }

  await enqueueJobProcessing(jobId, { force: true });
  return { status: 'PENDING' };
};

// Endpoint #5 (§11.3 / §12.3): vector similarity over stored job embeddings, no LLM call.
const getSimilarJobs = async (jobId, limit) => {
  const job = await prisma.job.findFirst({
    where: { id: jobId, isDeleted: false },
    select: { id: true }
  });
  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  const vecText = await getJobEmbeddingText(jobId);
  if (!vecText) {
    return { ready: false, jobs: [] };
  }

  const rows = await findSimilarJobs({ vecText, excludeJobId: jobId, limit });
  return { ready: true, jobs: rows.map(mapJobRow) };
};

// Endpoint #4 (§11.3 / §12.2): parse free text into filters + semantic query,
// embed it, and rank active jobs by cosine similarity. Provider failures become 502/503/504.
const searchJobs = async ({ q, page, limit }) => {
  const query = q.trim().replace(/\s+/g, ' ');
  const signal = AbortSignal.timeout(SYNC_REQUEST_TIMEOUT_MS);

  const { semanticQuery, filters } = await runAi(() => parseSearchQuery(query, { signal }));
  const vec = await runAi(() => embedQuery(semanticQuery, { signal }));

  const { rows, total } = await searchJobsRepo({
    vec,
    filters,
    minScore: aiConfig.searchMinScore,
    page,
    limit
  });

  return {
    query,
    interpreted: { semanticQuery, filters },
    jobs: rows.map(mapJobRow),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

module.exports = {
  getAiStatus,
  getJobInsights,
  regenerateJobInsights,
  getSimilarJobs,
  searchJobs
};
