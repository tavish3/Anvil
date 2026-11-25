const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  checkCoverLetterDraft,
  buildWarnings,
  buildReviseProblems,
} = require('../../src/ai/chains/coverLetter.chain');
const { getTone } = require('../../src/ai/prompts');

// Builds a plain-text letter of roughly `bodyWords` body words plus greeting/sign-off.
function makeLetter(bodyWords, { greeting = 'Dear Hiring Team,', signoff = 'Sincerely,\nPriya' } = {}) {
  const body = Array.from({ length: bodyWords }, (_, i) => `word${i}`).join(' ');
  return `${greeting}\n\n${body}\n\n${signoff}`;
}

test('checkCoverLetterDraft accepts a well-formed letter', () => {
  // PROFESSIONAL bounds: 220*0.9=198 .. 320*1.1=352 words; makeLetter adds ~5 extra words.
  assert.deepEqual(checkCoverLetterDraft(makeLetter(245)), []);
});

test('checkCoverLetterDraft flags placeholders', () => {
  const issues = checkCoverLetterDraft(makeLetter(245).replace('word0', '[Company]'));
  assert.ok(issues.some((i) => /placeholder/i.test(i)));
});

test('checkCoverLetterDraft flags markdown', () => {
  const bold = checkCoverLetterDraft(makeLetter(245).replace('word0', '**word0**'));
  assert.ok(bold.some((i) => /markdown/i.test(i)));

  const bullets = checkCoverLetterDraft(`${makeLetter(245)}\n- extra point`);
  assert.ok(bullets.some((i) => /markdown/i.test(i)));
});

test('checkCoverLetterDraft enforces per-tone word bounds', () => {
  // 250 total words: inside PROFESSIONAL (198-352), outside CONCISE (135-220).
  const letter = makeLetter(245);
  assert.ok(!checkCoverLetterDraft(letter, 'PROFESSIONAL').some((i) => /words/.test(i)));
  assert.ok(checkCoverLetterDraft(letter, 'CONCISE').some((i) => /words/.test(i)));

  // Boundaries: PROFESSIONAL min*0.9 = 198, max*1.1 = 352 (makeLetter adds 5 words).
  assert.ok(!checkCoverLetterDraft(makeLetter(193), 'PROFESSIONAL').some((i) => /words/.test(i))); // 198 words
  assert.ok(checkCoverLetterDraft(makeLetter(192), 'PROFESSIONAL').some((i) => /words/.test(i))); // 197 words
  assert.ok(!checkCoverLetterDraft(makeLetter(347), 'PROFESSIONAL').some((i) => /words/.test(i))); // 352 words
  assert.ok(checkCoverLetterDraft(makeLetter(348), 'PROFESSIONAL').some((i) => /words/.test(i))); // 353 words
});

test('checkCoverLetterDraft flags a missing greeting', () => {
  const issues = checkCoverLetterDraft(makeLetter(245, { greeting: 'Hello there,' }));
  assert.ok(issues.some((i) => /greeting/i.test(i)));
});

test('checkCoverLetterDraft tolerates non-string input', () => {
  const issues = checkCoverLetterDraft(null);
  assert.ok(issues.length > 0);
});

test('buildWarnings is empty when the critique passed', () => {
  assert.deepEqual(buildWarnings({ passed: true, unsupportedClaims: ['x'], issues: ['y'] }), []);
  assert.deepEqual(buildWarnings(undefined), []);
  assert.deepEqual(buildWarnings(null), []);
});

test('buildWarnings prefixes unsupported claims and appends issues', () => {
  const warnings = buildWarnings({
    passed: false,
    unsupportedClaims: ['Claim A', 'Claim B'],
    issues: ['Issue C'],
  });
  assert.deepEqual(warnings, ['Could not verify: Claim A', 'Could not verify: Claim B', 'Issue C']);
});

test('buildReviseProblems lists claims, issues, notes and a resume excerpt', () => {
  const problems = buildReviseProblems({
    critique: { unsupportedClaims: ['Invented metric'], issues: ['Too long'] },
    notes: 'I have an AWS certification',
    resumeText: 'RESUME TEXT HERE',
  });
  assert.ok(problems.includes('- Invented metric'));
  assert.ok(problems.includes('- Too long'));
  assert.ok(problems.includes('I have an AWS certification'));
  assert.ok(problems.includes('RESUME TEXT HERE'));
});

test('tone map bounds match the code-level checks', () => {
  assert.deepEqual(getTone('CONCISE').minWords, 150);
  assert.equal(getTone('CONCISE').maxWords, 200);
  assert.equal(getTone('PROFESSIONAL').minWords, 220);
  assert.equal(getTone('PROFESSIONAL').maxWords, 320);
  assert.equal(getTone('ENTHUSIASTIC').minWords, 220);
  assert.equal(getTone('BOGUS').minWords, 220); // unknown tone falls back to PROFESSIONAL
});
