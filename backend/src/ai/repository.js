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

module.exports = {
  hasJobEmbedding,
  setJobEmbedding,
  setResumeEmbedding,
  clearResumeEmbedding,
};
