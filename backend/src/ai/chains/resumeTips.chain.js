const {
  PROMPT_VERSION,
  CACHE_TTL_SECONDS,
  RESUME_PROMPT_MAX_CHARS,
} = require('../constants');
const { aiConfig } = require('../config');
const { getJson, setJson } = require('../cache');
const { getChatModel, structured, callOptions } = require('../llm');
const { resumeTipsPrompt } = require('../prompts');
const { ResumeTipsSchema } = require('../schemas');
const { normalizeTips } = require('../normalize');
const { runAi } = require('../errors');
const { buildJobDocument, sha256, truncate } = require('../text');

let chain = null;

function getChain() {
  if (!chain) {
    chain = resumeTipsPrompt.pipe(
      structured(getChatModel(), ResumeTipsSchema, 'resume_tips')
    );
  }
  return chain;
}

// Compact text rendering of the fit analysis for the §14.8 <match_analysis> block.
function renderAnalysis(analysis) {
  const a = analysis && typeof analysis === 'object' ? analysis : {};
  const lines = [];
  if (a.score != null) lines.push(`Score: ${a.score}/100 (${a.verdict || 'n/a'})`);
  if (a.summary) lines.push(`Summary: ${a.summary}`);
  if (Array.isArray(a.matchedSkills) && a.matchedSkills.length > 0) {
    lines.push(`Matched skills: ${a.matchedSkills.join(', ')}`);
  }
  if (Array.isArray(a.missingSkills) && a.missingSkills.length > 0) {
    lines.push(`Missing skills: ${a.missingSkills.join(', ')}`);
  }
  if (Array.isArray(a.strengths) && a.strengths.length > 0) {
    lines.push('Strengths:');
    for (const s of a.strengths) lines.push(`- ${s}`);
  }
  if (Array.isArray(a.gaps) && a.gaps.length > 0) {
    lines.push('Gaps:');
    for (const g of a.gaps) lines.push(`- ${g}`);
  }
  if (a.recommendation) lines.push(`Recommendation: ${a.recommendation}`);
  return lines.length > 0 ? lines.join('\n') : '(no match analysis available)';
}

async function generateResumeTips({ document, resumeText, analysis, signal } = {}) {
  return runAi(async () => {
    const raw = await getChain().invoke(
      {
        document,
        resume: truncate(resumeText, RESUME_PROMPT_MAX_CHARS),
        analysis: renderAnalysis(analysis),
      },
      callOptions(signal)
    );
    return normalizeTips(raw);
  });
}

async function getResumeTips({ job, employerName, resume, analysis, signal } = {}) {
  const document = buildJobDocument(job, employerName);
  const jobDocHash = sha256(document);
  const cacheKey = `ai:tips:${PROMPT_VERSION}:${aiConfig.chatModel}:${resume.textHash}:${jobDocHash}`;

  const cached = await getJson(cacheKey);
  if (cached) return { tips: cached, cached: true };

  const tips = await generateResumeTips({ document, resumeText: resume.text, analysis, signal });
  await setJson(cacheKey, tips, CACHE_TTL_SECONDS.TIPS);
  return { tips, cached: false };
}

module.exports = { generateResumeTips, getResumeTips };
