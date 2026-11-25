const { test } = require('node:test');
const assert = require('node:assert/strict');

const ApiError = require('../../src/utils/ApiError');
const { toApiError, runAi, isRateLimitError, getRetryDelayMs } = require('../../src/ai/errors');

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

test('toApiError maps 429 via statusCode (ChatGoogle) to 503', () => {
  const rateLimited = new Error('slow down');
  rateLimited.statusCode = 429;
  assert.equal(toApiError(rateLimited).statusCode, 503);
  assert.equal(isRateLimitError(rateLimited), true);
});

test('toApiError maps 429 via status (@google/genai) to 503', () => {
  const rateLimited = new Error('quota');
  rateLimited.status = 429;
  assert.equal(toApiError(rateLimited).statusCode, 503);
  assert.equal(isRateLimitError(rateLimited), true);
});

test('isRateLimitError detects RESOURCE_EXHAUSTED bodies', () => {
  const bodyErr = new Error('x');
  bodyErr.data = { error: { status: 'RESOURCE_EXHAUSTED' } };
  assert.equal(isRateLimitError(bodyErr), true);

  const plain = new Error('boom');
  assert.equal(isRateLimitError(plain), false);
});

test('toApiError maps PromptBlockedError to 422', () => {
  const blocked = new Error('prompt blocked');
  blocked.name = 'PromptBlockedError';
  assert.equal(toApiError(blocked).statusCode, 422);
});

test('toApiError maps everything else to 502', () => {
  assert.equal(toApiError(new Error('boom')).statusCode, 502);
  assert.equal(toApiError({ weird: true }).statusCode, 502);
  assert.equal(toApiError(null).statusCode, 502);
});

test('toApiError messages are friendly and leak nothing', () => {
  const apiErr = toApiError(new Error('AIza-secret-key-invalid'));
  assert.equal(apiErr.message, 'The AI service failed to respond. Please try again.');
  assert.ok(!apiErr.message.includes('AIza-secret'));
});

test('getRetryDelayMs reads RetryInfo details', () => {
  const err = new Error('quota');
  err.status = 429;
  err.data = {
    error: {
      status: 'RESOURCE_EXHAUSTED',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '12.5s' },
      ],
    },
  };
  assert.equal(getRetryDelayMs(err), 12500);

  const noDetails = new Error('quota');
  noDetails.data = { error: { status: 'RESOURCE_EXHAUSTED' } };
  assert.equal(getRetryDelayMs(noDetails), null);
  assert.equal(getRetryDelayMs(new Error('x')), null);
});

test('runAi returns fn result and converts thrown errors', async () => {
  assert.equal(await runAi(async () => 42), 42);
  await assert.rejects(runAi(async () => { throw new Error('nope'); }), (err) => err.statusCode === 502);
  const custom = new ApiError(400, 'bad input');
  await assert.rejects(runAi(async () => { throw custom; }), (err) => err === custom);
});
