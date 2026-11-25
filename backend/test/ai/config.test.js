const { test } = require('node:test');
const assert = require('node:assert/strict');

const { aiConfig, buildConfig } = require('../../src/ai/config');

test('aiConfig is frozen and exposes the documented shape', () => {
  assert.equal(typeof aiConfig, 'object');
  for (const key of ['enabled', 'active', 'apiKey', 'chatModel', 'writingModel', 'embeddingModel', 'thinkingLevel', 'requestTimeoutMs', 'searchMinScore', 'dailyRequestCap', 'workerConcurrency', 'workerRatePerMinute']) {
    assert.ok(key in aiConfig, `missing ${key}`);
  }
  assert.ok(Object.isFrozen(aiConfig));
});

test('buildConfig defaults: enabled but inactive without a key', () => {
  const cfg = buildConfig({});
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.active, false);
  assert.equal(cfg.apiKey, '');
  assert.equal(cfg.chatModel, 'gemini-3.5-flash-lite');
  assert.equal(cfg.writingModel, 'gemini-3.5-flash-lite');
  assert.equal(cfg.embeddingModel, 'gemini-embedding-2');
  assert.equal(cfg.thinkingLevel, 'low');
  assert.equal(cfg.requestTimeoutMs, 60000);
  assert.equal(cfg.searchMinScore, 0);
  assert.equal(cfg.dailyRequestCap, 100);
  assert.equal(cfg.workerConcurrency, 1);
  assert.equal(cfg.workerRatePerMinute, 6);
});

test('buildConfig active only when enabled AND key present', () => {
  assert.equal(buildConfig({ GEMINI_API_KEY: 'test-key' }).active, true);
  assert.equal(buildConfig({ GEMINI_API_KEY: 'test-key', AI_ENABLED: 'false' }).active, false);
  assert.equal(buildConfig({ GEMINI_API_KEY: 'test-key', AI_ENABLED: 'false' }).enabled, false);
  assert.equal(buildConfig({ AI_ENABLED: 'false' }).enabled, false);
});

test('buildConfig GOOGLE_API_KEY works as a fallback', () => {
  assert.equal(buildConfig({ GOOGLE_API_KEY: 'fallback-key' }).active, true);
  assert.equal(buildConfig({ GOOGLE_API_KEY: 'fallback-key' }).apiKey, 'fallback-key');
  assert.equal(
    buildConfig({ GEMINI_API_KEY: 'primary', GOOGLE_API_KEY: 'fallback' }).apiKey,
    'primary'
  );
});

test('buildConfig GEMINI_THINKING_LEVEL semantics', () => {
  assert.equal(buildConfig({ GEMINI_THINKING_LEVEL: undefined }).thinkingLevel, 'low');
  assert.equal(buildConfig({}).thinkingLevel, 'low');
  assert.equal(buildConfig({ GEMINI_THINKING_LEVEL: '' }).thinkingLevel, undefined);
  assert.equal(buildConfig({ GEMINI_THINKING_LEVEL: 'MINIMAL' }).thinkingLevel, 'minimal');
  assert.equal(buildConfig({ GEMINI_THINKING_LEVEL: 'high' }).thinkingLevel, 'high');
  assert.throws(() => buildConfig({ GEMINI_THINKING_LEVEL: 'extreme' }), /GEMINI_THINKING_LEVEL/);
});

test('buildConfig empty numeric variables fall back to defaults', () => {
  const cfg = buildConfig({ AI_REQUEST_TIMEOUT_MS: '', AI_DAILY_REQUEST_CAP: '', AI_WORKER_RATE_PER_MINUTE: '' });
  assert.equal(cfg.requestTimeoutMs, 60000);
  assert.equal(cfg.dailyRequestCap, 100);
  assert.equal(cfg.workerRatePerMinute, 6);
});

test('buildConfig rejects non-Gemini embedding models', () => {
  assert.throws(() => buildConfig({ GEMINI_EMBEDDING_MODEL: 'text-embedding-3-small' }), /GEMINI_EMBEDDING_MODEL/);
  assert.equal(buildConfig({ GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001' }).embeddingModel, 'gemini-embedding-001');
});

test('buildConfig GEMINI_WRITING_MODEL falls back to chat model', () => {
  assert.equal(buildConfig({ GEMINI_WRITING_MODEL: '' }).writingModel, 'gemini-3.5-flash-lite');
  assert.equal(buildConfig({ GEMINI_WRITING_MODEL: 'gemini-3.8-flash' }).writingModel, 'gemini-3.8-flash');
  assert.equal(
    buildConfig({ GEMINI_CHAT_MODEL: 'other-model', GEMINI_WRITING_MODEL: '' }).writingModel,
    'other-model'
  );
});

test('buildConfig throws a clear error naming invalid variables', () => {
  assert.throws(() => buildConfig({ AI_REQUEST_TIMEOUT_MS: 'abc' }), /AI_REQUEST_TIMEOUT_MS/);
  assert.throws(() => buildConfig({ AI_SEARCH_MIN_SCORE: '2' }), /AI_SEARCH_MIN_SCORE/);
  assert.throws(() => buildConfig({ AI_ENABLED: 'yes' }), /AI_ENABLED/);
  assert.throws(() => buildConfig({ AI_WORKER_CONCURRENCY: '0' }), /AI_WORKER_CONCURRENCY/);
});

test('buildConfig accepts numeric strings', () => {
  const cfg = buildConfig({ AI_REQUEST_TIMEOUT_MS: '30000', AI_DAILY_REQUEST_CAP: '50' });
  assert.equal(cfg.requestTimeoutMs, 30000);
  assert.equal(cfg.dailyRequestCap, 50);
});
