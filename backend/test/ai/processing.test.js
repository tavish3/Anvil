const test = require('node:test');
const assert = require('node:assert/strict');
const { jobContentHash, shouldSkipJobProcessing } = require('../../src/ai/processing');

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

test('jobContentHash is deterministic and changes with the document', () => {
  const h1 = jobContentHash('Title: Dev\nDescription: x');
  const h2 = jobContentHash('Title: Dev\nDescription: x');
  const h3 = jobContentHash('Title: Dev\nDescription: y');
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('shouldSkipJobProcessing skips only unchanged READY jobs with an embedding', () => {
  const base = { insight: { status: 'READY', contentHash: HASH_A }, contentHash: HASH_A, hasEmbedding: true };
  assert.equal(shouldSkipJobProcessing(base), true);

  // force always reprocesses
  assert.equal(shouldSkipJobProcessing({ ...base, force: true }), false);

  // no insight row / other statuses
  assert.equal(shouldSkipJobProcessing({ ...base, insight: null }), false);
  assert.equal(shouldSkipJobProcessing({ ...base, insight: { status: 'PENDING', contentHash: HASH_A } }), false);
  assert.equal(shouldSkipJobProcessing({ ...base, insight: { status: 'FAILED', contentHash: HASH_A } }), false);
  assert.equal(shouldSkipJobProcessing({ ...base, insight: { status: 'READY', contentHash: null } }), false);

  // changed content
  assert.equal(shouldSkipJobProcessing({ ...base, contentHash: HASH_B }), false);

  // READY with same hash but embedding missing
  assert.equal(shouldSkipJobProcessing({ ...base, hasEmbedding: false }), false);
  assert.equal(shouldSkipJobProcessing({ ...base, hasEmbedding: undefined }), false);

  // missing inputs never skip
  assert.equal(shouldSkipJobProcessing({}), false);
  assert.equal(shouldSkipJobProcessing(), false);
});
