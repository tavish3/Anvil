const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapJobRow, totalPages } = require('../../src/modules/ai/ai.mapper');

const baseRow = {
  id: 'job-1',
  title: 'Backend Developer',
  location: 'Bengaluru',
  locationType: 'HYBRID',
  jobType: 'FULL_TIME',
  salaryMin: 800000,
  salaryMax: 1500000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  deadline: new Date('2026-12-31T00:00:00Z'),
  employerId: 'emp-1',
  employerName: 'Acme Corp',
  employerAvatarUrl: 'https://example.com/a.png',
  score: 0.87654321
};

test('mapJobRow returns the JobCard DTO shape', () => {
  const card = mapJobRow(baseRow);
  assert.equal(card.id, 'job-1');
  assert.equal(card.title, 'Backend Developer');
  assert.equal(card.location, 'Bengaluru');
  assert.equal(card.locationType, 'HYBRID');
  assert.equal(card.jobType, 'FULL_TIME');
  assert.equal(card.salaryMin, 800000);
  assert.equal(card.salaryMax, 1500000);
  assert.deepEqual(card.employer, { id: 'emp-1', name: 'Acme Corp', avatarUrl: 'https://example.com/a.png' });
});

test('mapJobRow keeps dates as Date objects and rounds score to 4 decimals', () => {
  const card = mapJobRow(baseRow);
  assert.ok(card.createdAt instanceof Date);
  assert.ok(card.deadline instanceof Date);
  assert.equal(card.score, 0.8765);
});

test('mapJobRow handles null salary, deadline, avatar and missing score', () => {
  const card = mapJobRow({
    ...baseRow,
    salaryMin: null,
    salaryMax: null,
    deadline: null,
    employerAvatarUrl: null,
    score: null
  });
  assert.equal(card.salaryMin, null);
  assert.equal(card.salaryMax, null);
  assert.equal(card.deadline, null);
  assert.equal(card.employer.avatarUrl, null);
  assert.equal(card.score, 0);
});

test('totalPages rounds up and returns 0 for empty results', () => {
  assert.equal(totalPages(0, 10), 0);
  assert.equal(totalPages(1, 10), 1);
  assert.equal(totalPages(10, 10), 1);
  assert.equal(totalPages(11, 10), 2);
  assert.equal(totalPages(40, 10), 4);
});
