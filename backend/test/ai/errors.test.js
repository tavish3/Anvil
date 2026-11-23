const { test } = require('node:test');
const assert = require('node:assert/strict');

const ApiError = require('../../src/utils/ApiError');
const { toApiError, runAi } = require('../../src/ai/errors');

test('toApiError returns ApiError instances unchanged', () => {
  const original = new ApiError(422, 'custom');
  assert.equal(toApiError(original), original);
});

test('toApiError maps aborts/timeouts to 504', () => {
  const abort = new Error('aborted');
  abort.name = 'AbortError';
  assert.equal(toApiError(abort).statusCode, 504);

  const timeout = new Error('The operation timed out');
  timeout.name = 'TimeoutError';
  assert.equal(toApiError(timeout).statusCode, 504);

  const msg = new Error('Request timed out.');
  assert.equal(toApiError(msg).statusCode, 504);
});

test('toApiError maps 429 and insufficient_quota to 503', () => {
  const rateLimited = new Error('slow down');
  rateLimited.status = 429;
  assert.equal(toApiError(rateLimited).statusCode, 503);

  const quota = new Error('quota');
  quota.code = 'insufficient_quota';
  assert.equal(toApiError(quota).statusCode, 503);
});

test('toApiError maps everything else to 502', () => {
  assert.equal(toApiError(new Error('boom')).statusCode, 502);
  assert.equal(toApiError({ weird: true }).statusCode, 502);
  assert.equal(toApiError(null).statusCode, 502);
});

test('toApiError messages are friendly and leak nothing', () => {
  const apiErr = toApiError(new Error('sk-secret-key-invalid'));
  assert.equal(apiErr.message, 'The AI service failed to respond. Please try again.');
  assert.ok(!apiErr.message.includes('sk-secret'));
});

test('runAi returns fn result and converts thrown errors', async () => {
  assert.equal(await runAi(async () => 42), 42);
  await assert.rejects(runAi(async () => { throw new Error('nope'); }), (err) => err.statusCode === 502);
  const custom = new ApiError(400, 'bad input');
  await assert.rejects(runAi(async () => { throw custom; }), (err) => err === custom);
});
