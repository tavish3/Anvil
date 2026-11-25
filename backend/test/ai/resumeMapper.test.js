const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toResumeDTO } = require('../../src/modules/resumes/resume.mapper');

const baseRow = {
  id: 'res-1',
  userId: 'user-1',
  fileName: 'resume.pdf',
  fileUrl: 'https://res.cloudinary.com/demo/resume.pdf',
  text: 'Jane Doe\nSenior Backend Engineer\n\nSkills: Node.js, PostgreSQL, AWS',
  textHash: 'abc123',
  profile: { headline: 'Senior Backend Engineer', skills: ['Node.js'] },
  status: 'READY',
  error: null,
  embedding: '[0.1,0.2]',
  processedAt: new Date('2026-01-02T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-03T00:00:00Z')
};

test('toResumeDTO returns the ResumeDTO shape and never leaks internals', () => {
  const dto = toResumeDTO(baseRow);
  assert.deepEqual(Object.keys(dto).sort(), ['createdAt', 'fileName', 'fileUrl', 'id', 'profile', 'status', 'updatedAt', 'wordCount']);
  assert.equal(dto.id, 'res-1');
  assert.equal(dto.fileName, 'resume.pdf');
  assert.equal(dto.fileUrl, baseRow.fileUrl);
  assert.equal(dto.status, 'READY');
  assert.deepEqual(dto.profile, baseRow.profile);
  assert.equal(dto.wordCount, 9);
});

test('toResumeDTO computes wordCount from text and passes profile through', () => {
  const dto = toResumeDTO({ ...baseRow, text: 'one two  three\n\nfour', profile: null });
  assert.equal(dto.wordCount, 4);
  assert.equal(dto.profile, null);
});

test('toResumeDTO handles missing text/profile', () => {
  const dto = toResumeDTO({ ...baseRow, text: null, profile: undefined });
  assert.equal(dto.wordCount, 0);
  assert.equal(dto.profile, null);
});
