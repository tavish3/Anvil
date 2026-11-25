const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeList,
  normalizeJobInsights,
  normalizeSearchQuery,
  normalizeResumeProfile,
  normalizeFitAnalysis,
  scoreToVerdict,
  normalizeTips,
} = require('../../src/ai/normalize');
const { LIST_LIMITS } = require('../../src/ai/constants');

test('normalizeList trims, dedupes case-insensitively, clamps length and count', () => {
  const out = normalizeList(['  Node.js ', 'node.JS', '', '  ', 42, null, 'Postgres'], { max: 10 });
  assert.deepEqual(out, ['Node.js', 'Postgres']);

  const long = 'x'.repeat(200);
  const clamped = normalizeList([long], { max: 5, maxLen: 10 });
  assert.equal(clamped[0].length, 10);
  assert.equal(clamped.length, 1);

  const many = Array.from({ length: 20 }, (_, i) => `skill${i}`);
  assert.equal(normalizeList(many, { max: 6 }).length, 6);

  assert.deepEqual(normalizeList('not-an-array', { max: 5 }), []);
  assert.deepEqual(normalizeList(null, { max: 5 }), []);
});

test('normalizeJobInsights clamps lists and defaults bad experienceLevel', () => {
  const raw = {
    summary: 's'.repeat(500),
    experienceLevel: 'WIZARD',
    responsibilities: ['a', 'A', 'b'],
    requirements: Array.from({ length: 10 }, (_, i) => `req${i}`),
    niceToHave: ['x'],
    perks: ['y'],
  };
  const out = normalizeJobInsights(raw);
  assert.equal(out.summary.length, 400);
  assert.equal(out.highlights.experienceLevel, 'UNSPECIFIED');
  assert.deepEqual(out.highlights.responsibilities, ['a', 'b']);
  assert.equal(out.highlights.requirements.length, LIST_LIMITS.REQUIREMENTS);
  assert.deepEqual(normalizeJobInsights(null).highlights.perks, []);
  assert.equal(normalizeJobInsights({ summary: 5 }).summary, '');

  const flat = normalizeJobInsights({
    summary: 'S',
    experienceLevel: 'MID',
    responsibilities: ['Build APIs'],
    requirements: ['Node.js'],
    niceToHave: ['Docker'],
    perks: ['Health'],
  });
  assert.equal(flat.highlights.experienceLevel, 'MID');
  assert.deepEqual(flat.highlights.responsibilities, ['Build APIs']);
});

test('normalizeSearchQuery falls back to original query when semanticQuery empty', () => {
  const out = normalizeSearchQuery({ semanticQuery: '   ', filters: {} }, 'remote react jobs');
  assert.equal(out.semanticQuery, 'remote react jobs');

  const kept = normalizeSearchQuery({ semanticQuery: '  react dev  ' }, 'ignored');
  assert.equal(kept.semanticQuery, 'react dev');
});

test('normalizeSearchQuery nulls "remote" location and validates enums', () => {
  const out = normalizeSearchQuery({
    semanticQuery: 'x',
    locationType: 'REMOTE',
    jobType: 'remote',
    location: ' Remote ',
    salaryMin: null,
    salaryMax: null,
  }, 'q');
  assert.equal(out.filters.locationType, 'REMOTE');
  assert.equal(out.filters.jobType, null);
  assert.equal(out.filters.location, null);

  const city = normalizeSearchQuery({ semanticQuery: 'x', location: 'Pune' }, 'q');
  assert.equal(city.filters.location, 'Pune');
});

test('normalizeSearchQuery rounds salaries, drops non-positive, swaps min/max', () => {
  const out = normalizeSearchQuery({
    semanticQuery: 'x',
    salaryMin: 1500000.4,
    salaryMax: 1000000.6,
  }, 'q');
  assert.equal(out.filters.salaryMin, 1000001);
  assert.equal(out.filters.salaryMax, 1500000);

  const bad = normalizeSearchQuery({ semanticQuery: 'x', salaryMin: 0, salaryMax: -5 }, 'q');
  assert.equal(bad.filters.salaryMin, null);
  assert.equal(bad.filters.salaryMax, null);

  const nan = normalizeSearchQuery({ semanticQuery: 'x', salaryMin: NaN, salaryMax: 'abc' }, 'q');
  assert.equal(nan.filters.salaryMin, null);
  assert.equal(nan.filters.salaryMax, null);
});

test('scoreToVerdict band boundaries', () => {
  assert.equal(scoreToVerdict(0), 'WEAK_FIT');
  assert.equal(scoreToVerdict(34), 'WEAK_FIT');
  assert.equal(scoreToVerdict(35), 'PARTIAL_FIT');
  assert.equal(scoreToVerdict(54), 'PARTIAL_FIT');
  assert.equal(scoreToVerdict(55), 'GOOD_FIT');
  assert.equal(scoreToVerdict(74), 'GOOD_FIT');
  assert.equal(scoreToVerdict(75), 'STRONG_FIT');
  assert.equal(scoreToVerdict(100), 'STRONG_FIT');
});

test('normalizeResumeProfile clamps everything and survives malformed input', () => {
  const raw = {
    headline: '  Dev  ',
    summary: 's',
    skills: ['a', 'A', 'b'],
    totalYearsExperience: 200,
    roles: [
      { title: 'Eng', company: 'Acme', years: -3, highlights: ['h1', 'h2', 'h3', 'h4'] },
      { title: '', company: 'x' },
      'junk',
    ],
    education: [{ degree: 'B.Tech', institution: null, year: '2019' }, { degree: '' }],
    certifications: Array.from({ length: 12 }, (_, i) => `cert${i}`),
  };
  const out = normalizeResumeProfile(raw);
  assert.equal(out.headline, 'Dev');
  assert.deepEqual(out.skills, ['a', 'b']);
  assert.equal(out.totalYearsExperience, 60);
  assert.equal(out.roles.length, 1);
  assert.equal(out.roles[0].years, 0);
  assert.equal(out.roles[0].highlights.length, LIST_LIMITS.ROLE_HIGHLIGHTS);
  assert.equal(out.education.length, 1);
  assert.equal(out.certifications.length, LIST_LIMITS.CERTIFICATIONS);

  const empty = normalizeResumeProfile(null);
  assert.equal(empty.headline, null);
  assert.deepEqual(empty.roles, []);
  assert.equal(empty.totalYearsExperience, null);
});

test('normalizeFitAnalysis rounds/clamps score and derives verdict', () => {
  const out = normalizeFitAnalysis({
    score: 74.6,
    summary: 'ok',
    matchedSkills: Array.from({ length: 15 }, (_, i) => `s${i}`),
    missingSkills: [],
    strengths: ['a'],
    gaps: [],
    recommendation: 'apply',
  });
  assert.equal(out.score, 75);
  assert.equal(out.verdict, 'STRONG_FIT');
  assert.equal(out.matchedSkills.length, LIST_LIMITS.MATCHED_SKILLS);

  assert.equal(normalizeFitAnalysis({ score: NaN }).score, 0);
  assert.equal(normalizeFitAnalysis({ score: NaN }).verdict, 'WEAK_FIT');
  assert.equal(normalizeFitAnalysis({ score: 250 }).score, 100);
  assert.equal(normalizeFitAnalysis({ score: -10 }).score, 0);
  assert.equal(normalizeFitAnalysis('junk').score, 0);
});

test('normalizeTips drops invalid items and clamps counts', () => {
  const tips = [
    { section: 'SKILLS', priority: 'HIGH', suggestion: 'Add X', reason: 'why' },
    { section: 'BAD', priority: 'HIGH', suggestion: 'drop me', reason: '' },
    { section: 'SUMMARY', priority: 'URGENT', suggestion: 'drop me too', reason: '' },
    { section: 'EXPERIENCE', priority: 'LOW', suggestion: '  ', reason: '' },
  ];
  const out = normalizeTips({ summary: 's'.repeat(500), tips, keywordsToConsider: ['a', 'A', 'b'] });
  assert.equal(out.summary.length, 400);
  assert.equal(out.tips.length, 1);
  assert.equal(out.tips[0].section, 'SKILLS');
  assert.deepEqual(out.keywordsToConsider, ['a', 'b']);

  const many = { tips: Array.from({ length: 12 }, () => ({ section: 'OTHER', priority: 'LOW', suggestion: 's', reason: 'r' })) };
  assert.equal(normalizeTips(many).tips.length, LIST_LIMITS.TIPS);
  assert.deepEqual(normalizeTips(null).tips, []);
});
