const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TONE_MAP,
  getTone,
  jobInsightsPrompt,
  searchParserPrompt,
  resumeProfilePrompt,
  fitAnalysisPrompt,
  coverLetterPrompt,
  factCheckPrompt,
  revisePrompt,
  resumeTipsPrompt,
} = require('../../src/ai/prompts');

test('TONE_MAP covers all three tones with word bounds', () => {
  assert.deepEqual(Object.keys(TONE_MAP).sort(), ['CONCISE', 'ENTHUSIASTIC', 'PROFESSIONAL']);
  assert.equal(TONE_MAP.PROFESSIONAL.minWords, 220);
  assert.equal(TONE_MAP.PROFESSIONAL.maxWords, 320);
  assert.equal(TONE_MAP.ENTHUSIASTIC.minWords, 220);
  assert.equal(TONE_MAP.ENTHUSIASTIC.maxWords, 320);
  assert.equal(TONE_MAP.CONCISE.minWords, 150);
  assert.equal(TONE_MAP.CONCISE.maxWords, 200);
  for (const tone of Object.values(TONE_MAP)) {
    assert.ok(tone.tone_instruction.length > 0);
    assert.ok(tone.length_instruction.length > 0);
  }
});

test('getTone returns the map entry or falls back to PROFESSIONAL', () => {
  assert.equal(getTone('CONCISE'), TONE_MAP.CONCISE);
  assert.equal(getTone('NOPE'), TONE_MAP.PROFESSIONAL);
  assert.equal(getTone(undefined), TONE_MAP.PROFESSIONAL);
});

test('all §14 prompts are exported as runnable prompt templates', () => {
  const prompts = [
    jobInsightsPrompt,
    searchParserPrompt,
    resumeProfilePrompt,
    fitAnalysisPrompt,
    coverLetterPrompt,
    factCheckPrompt,
    revisePrompt,
    resumeTipsPrompt,
  ];
  for (const prompt of prompts) {
    assert.ok(prompt);
    assert.equal(typeof prompt.invoke, 'function');
  }
});
