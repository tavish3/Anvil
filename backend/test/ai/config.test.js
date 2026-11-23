const { test } = require('node:test');
const assert = require('node:assert/strict');

const { aiConfig, buildConfig } = require('../../src/ai/config');

test('aiConfig is frozen and exposes the documented shape', () => {
  assert.equal(typeof aiConfig, 'object');
  for (const key of ['enabled', 'active', 'apiKey', 'chatModel', 'writingModel', 'embeddingModel', 'reasoningEffort', 'requestTimeoutMs', 'searchMinScore', 'dailyRequestCap', 'workerConcurrency']) {
    assert.ok(key in aiConfig, `missing ${key}`);
  }
  assert.ok(Object.isFrozen(aiConfig));
});

test('buildConfig defaults: enabled but inactive without a key', () => {
  const cfg = buildConfig({});
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.active, false);
  assert.equal(cfg.apiKey, '');
  assert.equal(cfg.chatModel, 'gpt-6-luna');
  assert.equal(cfg.writingModel, 'gpt-6-luna');
  assert.equal(cfg.embeddingModel, 'text-embedding-3-small');
  assert.equal(cfg.reasoningEffort, 'low');
  assert.equal(cfg.requestTimeoutMs, 60000);
  assert.equal(cfg.searchMinScore, 0.15);
  assert.equal(cfg.dailyRequestCap, 2000);
  assert.equal(cfg.workerConcurrency, 2);
});

test('buildConfig active only when enabled AND key present', () => {
  assert.equal(buildConfig({ OPENAI_API_KEY: 'sk-test' }).active, true);
  assert.equal(buildConfig({ OPENAI_API_KEY: 'sk-test', AI_ENABLED: 'false' }).active, false);
  assert.equal(buildConfig({ OPENAI_API_KEY: 'sk-test', AI_ENABLED: 'false' }).enabled, false);
  assert.equal(buildConfig({ AI_ENABLED: 'false' }).enabled, false);
});

test('buildConfig OPENAI_REASONING_EFFORT semantics', () => {
  assert.equal(buildConfig({ OPENAI_REASONING_EFFORT: undefined }).reasoningEffort, 'low');
  assert.equal(buildConfig({}).reasoningEffort, 'low');
  assert.equal(buildConfig({ OPENAI_REASONING_EFFORT: '' }).reasoningEffort, undefined);
  assert.equal(buildConfig({ OPENAI_REASONING_EFFORT: 'none' }).reasoningEffort, 'none');
  assert.equal(buildConfig({ OPENAI_REASONING_EFFORT: 'medium' }).reasoningEffort, 'medium');
  assert.throws(() => buildConfig({ OPENAI_REASONING_EFFORT: 'extreme' }), /OPENAI_REASONING_EFFORT/);
});

test('buildConfig OPENAI_WRITING_MODEL falls back to chat model', () => {
  assert.equal(buildConfig({ OPENAI_WRITING_MODEL: '' }).writingModel, 'gpt-6-luna');
  assert.equal(buildConfig({ OPENAI_WRITING_MODEL: 'gpt-6.1-terra' }).writingModel, 'gpt-6.1-terra');
  assert.equal(
    buildConfig({ OPENAI_CHAT_MODEL: 'other-model', OPENAI_WRITING_MODEL: '' }).writingModel,
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
