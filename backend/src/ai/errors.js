const ApiError = require('../utils/ApiError');

class EmptyModelOutputError extends Error {
  constructor(message = 'The AI model returned an empty response.') {
    super(message);
    this.name = 'EmptyModelOutputError';
  }
}

// ChatGoogle (RequestError) puts the HTTP code in `statusCode`; @google/genai (ApiError) in `status`.
const httpCode = (err) => err?.statusCode ?? err?.status ?? err?.response?.status ?? null;

// Google error bodies: RequestError => err.data.error ; @google/genai ApiError => JSON string in err.message
function googleErrorBody(err) {
  if (err?.data?.error && typeof err.data.error === 'object') return err.data.error;
  try {
    const parsed = JSON.parse(String(err?.message ?? ''));
    if (parsed && typeof parsed.error === 'object') return parsed.error;
  } catch (_) { /* not JSON */ }
  return null;
}

function isRateLimitError(err) {
  if (httpCode(err) === 429) return true;
  const body = googleErrorBody(err);
  return body?.status === 'RESOURCE_EXHAUSTED';
}

// Milliseconds suggested by Google (RetryInfo detail such as "31s"), or null.
function getRetryDelayMs(err) {
  const details = googleErrorBody(err)?.details;
  if (Array.isArray(details)) {
    for (const d of details) {
      if (typeof d?.['@type'] === 'string' && d['@type'].endsWith('RetryInfo') && typeof d.retryDelay === 'string') {
        const seconds = parseFloat(d.retryDelay);
        if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
      }
    }
  }
  return null;
}

function toApiError(err) {
  if (err instanceof ApiError) return err;
  console.error('[AI] provider error:', String(err?.message ?? err).slice(0, 300));
  const msg = String(err?.message ?? '');
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || /timed out|aborted/i.test(msg)) {
    return new ApiError(504, 'The AI request timed out. Please try again.');
  }
  if (isRateLimitError(err)) {
    return new ApiError(503, 'The AI service is busy right now. Please try again shortly.');
  }
  if (err?.name === 'PromptBlockedError') {
    return new ApiError(422, 'This content could not be processed by the AI service.');
  }
  return new ApiError(502, 'The AI service failed to respond. Please try again.');
}

async function runAi(fn) {
  try {
    return await fn();
  } catch (err) {
    throw toApiError(err);
  }
}

module.exports = { EmptyModelOutputError, toApiError, runAi, isRateLimitError, getRetryDelayMs };
