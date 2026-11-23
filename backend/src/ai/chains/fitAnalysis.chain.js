const { PROMPT_VERSION, CACHE_TTL_SECONDS, RESUME_PROMPT_MAX_CHARS } = require('../constants');
const { getJson, setJson } = require('../cache');
const { getChatModel, structured } = require('../llm');
const { fitAnalysisPrompt } = require('../prompts');
const { FitAnalysisSchema } = require('../schemas');
const { normalizeFitAnalysis } = require('../normalize');
const { runAi } = require('../errors');
const { buildJobDocument, sha256, truncate } = require('../text');

let chain = null;

function getChain() {
  if (!chain) {
    chain = fitAnalysisPrompt.pipe(
      structured(getChatModel(), FitAnalysisSchema, 'fit_analysis')
    );
  }
  return chain;
}

async function analyzeFit({ document, resumeText, signal } = {}) {
  return runAi(async () => {
    const raw = await getChain().invoke(
      {
        document,
        resume: truncate(resumeText, RESUME_PROMPT_MAX_CHARS),
      },
      { signal }
    );
    return normalizeFitAnalysis(raw);
  });
}

async function getFitAnalysis({ job, employerName, resume, signal } = {}) {
  const document = buildJobDocument(job, employerName);
  const jobDocHash = sha256(document);
  const cacheKey = `ai:fit:${PROMPT_VERSION}:${resume.textHash}:${jobDocHash}`;

  const cached = await getJson(cacheKey);
  if (cached) return { analysis: cached, cached: true };

  const analysis = await analyzeFit({ document, resumeText: resume.text, signal });
  await setJson(cacheKey, analysis, CACHE_TTL_SECONDS.FIT);
  return { analysis, cached: false };
}

module.exports = { analyzeFit, getFitAnalysis };
