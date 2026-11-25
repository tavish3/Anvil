// Row -> ResumeDTO (AI spec §11.1). Pure: no prisma/redis imports, so it can be unit-tested.
// text, textHash, embedding and error are internal and never returned.
const { wordCount } = require('../../ai/text');

const toResumeDTO = (row) => ({
  id: row.id,
  fileName: row.fileName,
  fileUrl: row.fileUrl,
  status: row.status,
  wordCount: wordCount(row.text),
  profile: row.profile ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

module.exports = { toResumeDTO };
