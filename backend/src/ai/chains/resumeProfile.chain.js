const { RESUME_PROMPT_MAX_CHARS } = require('../constants');
const { getChatModel, structured } = require('../llm');
const { resumeProfilePrompt } = require('../prompts');
const { ResumeProfileSchema } = require('../schemas');
const { normalizeResumeProfile } = require('../normalize');
const { runAi } = require('../errors');
const { truncate } = require('../text');

let chain = null;

function getChain() {
  if (!chain) {
    chain = resumeProfilePrompt.pipe(
      structured(getChatModel(), ResumeProfileSchema, 'resume_profile')
    );
  }
  return chain;
}

async function extractResumeProfile(resumeText, { signal } = {}) {
  return runAi(async () => {
    const raw = await getChain().invoke(
      { resume: truncate(resumeText, RESUME_PROMPT_MAX_CHARS) },
      { signal }
    );
    return normalizeResumeProfile(raw);
  });
}

module.exports = { extractResumeProfile };
