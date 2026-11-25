const { runAi } = require('../errors');
const { getChatModel, structured, callOptions } = require('../llm');
const { jobInsightsPrompt } = require('../prompts');
const { JobInsightsSchema } = require('../schemas');
const { normalizeJobInsights } = require('../normalize');

let chain = null;

function getChain() {
  if (!chain) {
    chain = jobInsightsPrompt.pipe(
      structured(getChatModel(), JobInsightsSchema, 'job_insights')
    );
  }
  return chain;
}

async function generateJobInsights(document, { signal } = {}) {
  return runAi(async () => {
    const raw = await getChain().invoke({ document }, callOptions(signal));
    return normalizeJobInsights(raw);
  });
}

module.exports = { generateJobInsights };
