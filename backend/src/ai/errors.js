const ApiError = require('../utils/ApiError');

function toApiError(err) {
  if (err instanceof ApiError) return err;

  const name = err && err.name ? err.name : '';
  const message = err && err.message ? String(err.message) : '';
  const lower = message.toLowerCase();

  // Log the provider message only — never prompts, resume text or the API key.
  console.error('[AI] provider error:', message || err);

  if (name === 'AbortError' || name === 'TimeoutError' || lower.includes('timed out') || lower.includes('aborted')) {
    return new ApiError(504, 'The AI request timed out. Please try again.');
  }
  if ((err && err.status === 429) || (err && err.code === 'insufficient_quota')) {
    return new ApiError(503, 'The AI service is busy right now. Please try again shortly.');
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

module.exports = { toApiError, runAi };
