const { Prisma } = require('@prisma/client');
const prisma = require('../config/db');
const { toVectorLiteral } = require('./vector');

// All raw SQL for the AI tables lives here (AI spec §8.8). Vectors go through
// toVectorLiteral and are cast with ::vector; `db` may be the prisma client or a transaction client.

async function hasJobEmbedding(jobId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT ("embedding" IS NOT NULL) AS "has" FROM "JobInsight" WHERE "jobId" = ${jobId}`
  );
  return rows[0]?.has === true;
}

async function setJobEmbedding(db, jobId, vec) {
  const lit = toVectorLiteral(vec);
  await db.$executeRaw(
    Prisma.sql`UPDATE "JobInsight" SET "embedding" = ${lit}::vector WHERE "jobId" = ${jobId}`
  );
}

async function setResumeEmbedding(db, userId, textHash, vec) {
  const lit = toVectorLiteral(vec);
  return db.$executeRaw(
    Prisma.sql`UPDATE "Resume" SET "embedding" = ${lit}::vector WHERE "userId" = ${userId} AND "textHash" = ${textHash}`
  );
}

async function clearResumeEmbedding(db, userId) {
  await db.$executeRaw(
    Prisma.sql`UPDATE "Resume" SET "embedding" = NULL WHERE "userId" = ${userId}`
  );
}

// `embedding::text` yields a '[...]' vector literal that can be cast back with ::vector.
async function getJobEmbeddingText(jobId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT "embedding"::text AS "e" FROM "JobInsight" WHERE "jobId" = ${jobId}`
  );
  return rows[0]?.e ?? null;
}

const LIST_COLUMNS = Prisma.sql`
  j."id", j."title", j."location", j."locationType", j."jobType",
  j."salaryMin", j."salaryMax", j."createdAt", j."deadline",
  u."id" AS "employerId", u."name" AS "employerName", u."avatarUrl" AS "employerAvatarUrl"`;

const ACTIVE_JOB = Prisma.sql`
  ji."embedding" IS NOT NULL AND j."isDeleted" = false
  AND (j."deadline" IS NULL OR j."deadline" >= NOW())`;

async function findSimilarJobs({ vecText, excludeJobId, limit }) {
  return prisma.$queryRaw(Prisma.sql`
    SELECT ${LIST_COLUMNS},
           1 - (ji."embedding" <=> ${vecText}::vector) AS "score"
    FROM "JobInsight" ji
    JOIN "Job" j ON j."id" = ji."jobId"
    JOIN "User" u ON u."id" = j."employerId"
    WHERE ${ACTIVE_JOB}
      AND ji."jobId" <> ${excludeJobId}
    ORDER BY ji."embedding" <=> ${vecText}::vector ASC
    LIMIT ${limit}
  `);
}

module.exports = {
  hasJobEmbedding,
  setJobEmbedding,
  setResumeEmbedding,
  clearResumeEmbedding,
  getJobEmbeddingText,
  findSimilarJobs,
};
