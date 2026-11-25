// Live Gemini smoke test (AI spec §18.1). Requires a real GEMINI_API_KEY.
// Usage: npm run ai:smoke [-- --full]

const assert = require('node:assert/strict');

const { aiConfig } = require('../src/ai/config');
const { embedQuery, embedDocument } = require('../src/ai/embeddings');
const { getChatModel, getText, callOptions } = require('../src/ai/llm');
const { buildJobDocument, sha256 } = require('../src/ai/text');
const { EMBEDDING_DIMENSIONS } = require('../src/ai/constants');
const { parseSearchQuery } = require('../src/ai/chains/searchParser.chain');
const { generateJobInsights } = require('../src/ai/chains/jobInsights.chain');
const { extractResumeProfile } = require('../src/ai/chains/resumeProfile.chain');
const { analyzeFit } = require('../src/ai/chains/fitAnalysis.chain');
const { runApplicationAssistant } = require('../src/ai/graphs/applicationAssistant.graph');
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

function assertUnitVector(vec) {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  assert.ok(Math.abs(norm - 1) <= 0.01, `embedding norm ${norm} is not ~1`);
}

const checks = [
  {
    name: 'embeddings',
    run: async () => {
      const [queryVec, docVec] = await Promise.all([
        embedQuery('hello', { cache: false }),
        embedDocument('a job text', { title: 'Engineer' }),
      ]);
      for (const vec of [queryVec, docVec]) {
        assert.equal(vec.length, EMBEDDING_DIMENSIONS);
        assert.ok(vec.every((v) => typeof v === 'number' && Number.isFinite(v)));
        assertUnitVector(vec);
      }
      assert.notDeepEqual(queryVec, docVec);
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
  // §18.1 item 6 — only with --full (the cover-letter graph makes up to 5 LLM calls).
  {
    name: 'cover letter (graph)',
    fullOnly: true,
    run: async () => {
      const result = await runApplicationAssistant({
        mode: 'COVER_LETTER',
        job: SAMPLE_JOB,
        employerName: EMPLOYER_NAME,
        resumeText: SAMPLE_RESUME,
        resumeHash: sha256(SAMPLE_RESUME),
        candidateName: 'Priya Sharma',
        tone: 'PROFESSIONAL',
        notes: '',
      });
      assert.ok(typeof result.coverLetter === 'string' && result.coverLetter.length > 0);
      assert.ok(!/\[[^\]\n]{1,60}\]/.test(result.coverLetter), 'cover letter contains a placeholder');
    },
  },
  {
    name: 'resume tips (graph)',
    fullOnly: true,
    run: async () => {
      const result = await runApplicationAssistant({
        mode: 'RESUME_TIPS',
        job: SAMPLE_JOB,
        employerName: EMPLOYER_NAME,
        resumeText: SAMPLE_RESUME,
        resumeHash: sha256(SAMPLE_RESUME),
        candidateName: 'Priya Sharma',
      });
      assert.ok(Array.isArray(result.tips) && result.tips.length >= 1);
    },
  },
  {
    name: 'plain text',
    run: async () => {
      const message = await getChatModel().invoke('Reply with exactly the word OK.', callOptions());
      const text = getText(message);
      assert.ok(typeof text === 'string' && text.length > 0);
    },
  },
];

async function cleanup() {
  try { await redis.quit(); } catch { /* already closed */ }
  try { await prisma.$disconnect(); } catch { /* ignore */ }
}

async function main() {
  const full = process.argv.includes('--full');

  if (!aiConfig.active) {
    console.error('AI is not active. Set AI_ENABLED=true and a valid GEMINI_API_KEY in backend/.env.');
    process.exitCode = 1;
    return;
  }

  console.log(`chat model: ${aiConfig.chatModel}`);
  console.log(`embedding model: ${aiConfig.embeddingModel}`);

  let failed = 0;
  for (const check of checks) {
    if (check.fullOnly && !full) continue;
    const start = Date.now();
    try {
      await check.run();
      console.log(`PASS ${check.name} (${Date.now() - start}ms)`);
    } catch (err) {
      failed += 1;
      if (err?.status === 429 || err?.statusCode === 429) {
        console.log(`FAIL ${check.name} (${Date.now() - start}ms): quota exceeded — wait a minute or check https://aistudio.google.com/rate-limit`);
      } else {
        console.log(`FAIL ${check.name} (${Date.now() - start}ms): ${err.message}`);
      }
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
    if (err?.status === 429 || err?.statusCode === 429) {
      console.error('quota exceeded — wait a minute or check https://aistudio.google.com/rate-limit');
    } else {
      console.error('ai-smoke crashed:', err.message);
    }
    process.exitCode = 1;
  })
  .finally(cleanup);
