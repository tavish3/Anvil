const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  sha256,
  cleanText,
  stripPdfPageMarkers,
  truncate,
  wordCount,
  escapeLike,
  buildJobDocument,
  buildResumeEmbeddingText,
} = require('../../src/ai/text');
const { JOB_DESCRIPTION_MAX_CHARS, RESUME_EMBED_RAW_CHARS } = require('../../src/ai/constants');

const NL = '\n';
const TAB = '\t';
const NUL = String.fromCharCode(0);
const BEL = String.fromCharCode(7);
const VT = String.fromCharCode(11);

test('sha256 returns a 64-char hex digest', () => {
  const hash = sha256('hello');
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(sha256('hello'), hash);
  assert.notEqual(sha256('hello!'), hash);
});

test('cleanText normalizes newlines and strips control characters', () => {
  assert.equal(cleanText('a\r\nb\rc'), 'a\nb\nc');
  assert.equal(cleanText('a' + NUL + 'b' + TAB + 'c' + NL + 'd'), 'ab' + TAB + 'c' + NL + 'd');
  assert.equal(cleanText('a' + BEL + 'b'), 'ab');
  assert.equal(cleanText('a' + VT + 'b'), 'ab');
  assert.equal(cleanText('x  ' + NL + 'y   ' + NL + 'z'), 'x' + NL + 'y' + NL + 'z');
  assert.equal(cleanText('a' + NL + NL + NL + NL + 'b'), 'a' + NL + NL + 'b');
  assert.equal(cleanText('  padded  '), 'padded');
  assert.equal(cleanText(null), '');
  assert.equal(cleanText(42), '');
});

test('stripPdfPageMarkers removes pdf-parse v2 page markers', () => {
  const input = 'Page one text.' + NL + NL + '-- 1 of 3 --' + NL + NL + 'Middle text.' + NL + NL + '-- 2 of 3 --' + NL + NL + '-- 3 of 3 --' + NL + NL + 'End text.';
  const out = stripPdfPageMarkers(input);
  assert.ok(!out.includes('-- 1 of 3 --'));
  assert.ok(!out.includes('-- 3 of 3 --'));
  assert.ok(out.includes('Page one text.'));
  assert.ok(out.includes('End text.'));
});

test('truncate slices long strings and passes short ones through', () => {
  assert.equal(truncate('abc', 10), 'abc');
  assert.equal(truncate('abcdef', 3), 'abc');
  assert.equal(truncate(null, 3), '');
});

test('wordCount counts whitespace-separated tokens', () => {
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount('   '), 0);
  assert.equal(wordCount('one two  three'), 3);
  assert.equal(wordCount('hello' + NL + 'world'), 2);
});

test('escapeLike escapes backslash, percent and underscore', () => {
  assert.equal(escapeLike('100%_\\x'), '100\\%\\_\\\\x');
  assert.equal(escapeLike('plain'), 'plain');
});

test('buildJobDocument renders all sections', () => {
  const job = {
    title: 'Backend Developer',
    location: 'Bengaluru',
    locationType: 'HYBRID',
    jobType: 'FULL_TIME',
    salaryMin: 300000,
    salaryMax: 600000,
    skills: ['Node.js', 'PostgreSQL'],
    description: 'Build APIs.\r\n\r\n\r\nShip fast.',
  };
  const doc = buildJobDocument(job, 'Acme Corp');
  assert.ok(doc.includes('Title: Backend Developer'));
  assert.ok(doc.includes('Company: Acme Corp'));
  assert.ok(doc.includes('Location: Bengaluru (HYBRID)'));
  assert.ok(doc.includes('Job type: FULL_TIME'));
  assert.ok(doc.includes('Salary: 300000 - 600000 INR per year'));
  assert.ok(doc.includes('Skills: Node.js, PostgreSQL'));
  assert.ok(doc.includes('Description:' + NL + 'Build APIs.' + NL + NL + 'Ship fast.'));
});

test('buildJobDocument salary variants', () => {
  const base = { title: 'T', location: 'L', locationType: 'REMOTE', jobType: 'CONTRACT', description: 'd' };
  assert.ok(!buildJobDocument({ ...base }, 'C').includes('Salary'));
  assert.ok(buildJobDocument({ ...base, salaryMin: 100 }, 'C').includes('Salary: from 100 INR per year'));
  assert.ok(buildJobDocument({ ...base, salaryMax: 200 }, 'C').includes('Salary: up to 200 INR per year'));
  assert.ok(!buildJobDocument({ ...base, skills: [] }, 'C').includes('Skills:'));
});

test('buildJobDocument truncates long descriptions', () => {
  const job = { title: 'T', location: 'L', locationType: 'REMOTE', jobType: 'FULL_TIME', description: 'x'.repeat(JOB_DESCRIPTION_MAX_CHARS + 100) };
  const doc = buildJobDocument(job, 'C');
  const desc = doc.split('Description:' + NL)[1];
  assert.equal(desc.length, JOB_DESCRIPTION_MAX_CHARS);
});

test('buildResumeEmbeddingText with profile includes structured fields and excerpt', () => {
  const profile = {
    headline: 'Senior Backend Engineer',
    summary: 'Builds APIs.',
    skills: ['Node.js', 'Postgres'],
    roles: [{ title: 'Engineer', company: 'Acme', highlights: ['Shipped X'] }],
    education: [{ degree: 'B.Tech', institution: 'IIT', year: '2019' }],
  };
  const raw = 'R'.repeat(RESUME_EMBED_RAW_CHARS + 500);
  const text = buildResumeEmbeddingText(profile, raw);
  assert.ok(text.includes('Headline: Senior Backend Engineer'));
  assert.ok(text.includes('Skills: Node.js, Postgres'));
  assert.ok(text.includes('Experience:'));
  assert.ok(text.includes('- Engineer at Acme: Shipped X'));
  assert.ok(text.includes('Education:'));
  assert.ok(text.includes('Resume excerpt:'));
  assert.ok(text.endsWith('R'.repeat(RESUME_EMBED_RAW_CHARS)));
});

test('buildResumeEmbeddingText without profile truncates raw text', () => {
  const raw = 'y'.repeat(RESUME_EMBED_RAW_CHARS * 3 + 100);
  const text = buildResumeEmbeddingText(null, raw);
  assert.equal(text.length, RESUME_EMBED_RAW_CHARS * 3);
  assert.ok(!text.includes('Headline:'));
});
