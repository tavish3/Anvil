const { Prisma } = require('@prisma/client');
const prisma = require('../config/db');
const { toVectorLiteral } = require('./vector');
const { escapeLike } = require('./text');

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

// Semantic search (AI spec §8.8 / §12.2): hard filters + cosine ranking over stored embeddings.
async function searchJobs({ vec, filters = {}, minScore = 0, page = 1, limit = 10 }) {
  const lit = toVectorLiteral(vec);
  const dist = Prisma.sql`ji."embedding" <=> ${lit}::vector`;

  const conds = [
    ACTIVE_JOB,
    Prisma.sql`(1 - (${dist})) >= ${minScore}`,
  ];

  const { locationType, jobType, location, salaryMin, salaryMax } = filters;
  if (locationType) conds.push(Prisma.sql`j."locationType" = ${locationType}::"LocationType"`);
  if (jobType) conds.push(Prisma.sql`j."jobType" = ${jobType}::"JobType"`);
  if (location) conds.push(Prisma.sql`j."location" ILIKE ${'%' + escapeLike(location) + '%'}`);
  if (salaryMin != null) conds.push(Prisma.sql`j."salaryMax" >= ${salaryMin}`);
  if (salaryMax != null) conds.push(Prisma.sql`j."salaryMin" <= ${salaryMax}`);

  const where = Prisma.join(conds, ' AND ');

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT ${LIST_COLUMNS},
             1 - (${dist}) AS "score"
      FROM "JobInsight" ji
      JOIN "Job" j ON j."id" = ji."jobId"
      JOIN "User" u ON u."id" = j."employerId"
      WHERE ${where}
      ORDER BY ${dist} ASC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS "total"
      FROM "JobInsight" ji
      JOIN "Job" j ON j."id" = ji."jobId"
      WHERE ${where}
    `),
  ]);

  return { rows, total: countRows[0]?.total ?? 0 };
}

module.exports = {
  hasJobEmbedding,
  setJobEmbedding,
  setResumeEmbedding,
  clearResumeEmbedding,
  getJobEmbeddingText,
  findSimilarJobs,
  searchJobs,
};
