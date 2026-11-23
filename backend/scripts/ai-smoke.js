// Live OpenAI smoke test (AI spec §18.1). Requires a real OPENAI_API_KEY.
// Usage: npm run ai:smoke [-- --full]

const assert = require('node:assert/strict');

const { aiConfig } = require('../src/ai/config');
const { embedQuery } = require('../src/ai/embeddings');
const { buildJobDocument } = require('../src/ai/text');
const { EMBEDDING_DIMENSIONS } = require('../src/ai/constants');
const { parseSearchQuery } = require('../src/ai/chains/searchParser.chain');
const { generateJobInsights } = require('../src/ai/chains/jobInsights.chain');
const { extractResumeProfile } = require('../src/ai/chains/resumeProfile.chain');
const { analyzeFit } = require('../src/ai/chains/fitAnalysis.chain');
const redis = require('../src/config/redis');
const prisma = require('../src/config/db');

// Fictional sample data — no real personal data.
const SAMPLE_JOB = {
  title: 'Junior Backend Developer',
  location: 'Bengaluru',
  locationType: 'HYBRID',
  jobType: 'FULL_TIME',
  salaryMin: 600000,
  salaryMax: 1200000,
  skills: ['Node.js', 'PostgreSQL', 'REST APIs'],
  description: 'We are hiring a junior backend developer to build and maintain REST APIs for our job board platform. You will work with Node.js, Express and PostgreSQL, write tests, review code and participate in on-call rotations. 1-2 years of experience preferred. Nice to have: Docker, Redis, CI/CD.',
};
const EMPLOYER_NAME = 'Fictional Tech Pvt Ltd';
const JOB_DOCUMENT = buildJobDocument(SAMPLE_JOB, EMPLOYER_NAME);

const SAMPLE_RESUME = `Priya Sharma
priya.sharma@example.com | Bengaluru

SUMMARY
Junior software developer with 1 year of professional experience building backend services.

EXPERIENCE
Junior Developer — PixelWorks (Jun 2025 - Present)
- Built REST APIs with Node.js and Express
- Worked with PostgreSQL for data storage and queries
- Wrote unit tests and fixed bugs reported by QA

EDUCATION
B.Tech Computer Science — Example University (2025)

SKILLS
JavaScript, Node.js, Express, PostgreSQL, Git, HTML, CSS`;

const EXPERIENCE_LEVELS = ['INTERN', 'ENTRY', 'MID', 'SENIOR', 'LEAD', 'UNSPECIFIED'];
const VERDICTS = ['STRONG_FIT', 'GOOD_FIT', 'PARTIAL_FIT', 'WEAK_FIT'];

const checks = [
  {
    name: 'embeddings',
    run: async () => {
      const vec = await embedQuery('hello');
      assert.equal(vec.length, EMBEDDING_DIMENSIONS);
      assert.ok(vec.every((v) => typeof v === 'number' && Number.isFinite(v)));
    },
  },
  {
    name: 'search parsing',
    run: async () => {
      const parsed = await parseSearchQuery('remote react developer 10+ LPA');
      assert.equal(parsed.filters.locationType, 'REMOTE');
      assert.equal(parsed.filters.salaryMin, 1000000);
    },
  },
  {
    name: 'job insights',
    run: async () => {
      const insights = await generateJobInsights(JOB_DOCUMENT);
      assert.ok(insights.summary && insights.summary.length > 0);
      assert.ok(EXPERIENCE_LEVELS.includes(insights.highlights.experienceLevel));
    },
  },
  {
    name: 'resume profile',
    run: async () => {
      const profile = await extractResumeProfile(SAMPLE_RESUME);
      assert.ok(profile.skills.length > 0);
    },
  },
  {
    name: 'fit analysis',
    run: async () => {
      const analysis = await analyzeFit({ document: JOB_DOCUMENT, resumeText: SAMPLE_RESUME });
      assert.ok(Number.isFinite(analysis.score) && analysis.score >= 0 && analysis.score <= 100);
      assert.ok(VERDICTS.includes(analysis.verdict));
    },
  },
];

async function cleanup() {
  try { await redis.quit(); } catch { /* already closed */ }
  try { await prisma.$disconnect(); } catch { /* ignore */ }
}

async function main() {
  const full = process.argv.includes('--full');
  if (full) {
    console.log('graph checks are added in phase AI-9');
  }

  if (!aiConfig.active) {
    console.error('AI is not active. Set AI_ENABLED=true and a valid OPENAI_API_KEY in backend/.env.');
    process.exitCode = 1;
    return;
  }

  let failed = 0;
  for (const check of checks) {
    const start = Date.now();
    try {
      await check.run();
      console.log(`PASS ${check.name} (${Date.now() - start}ms)`);
    } catch (err) {
      failed += 1;
      console.log(`FAIL ${check.name} (${Date.now() - start}ms): ${err.message}`);
    }
  }

  if (failed > 0) {
    console.error(`${failed} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('All checks passed.');
  }
}

main()
  .catch((err) => {
    console.error('ai-smoke crashed:', err.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
