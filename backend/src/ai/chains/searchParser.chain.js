const { PROMPT_VERSION, CACHE_TTL_SECONDS } = require('../constants');
const { getJson, setJson } = require('../cache');
const { getChatModel, structured } = require('../llm');
const { searchParserPrompt } = require('../prompts');
const { SearchQuerySchema } = require('../schemas');
const { normalizeSearchQuery } = require('../normalize');
const { runAi } = require('../errors');
const { sha256 } = require('../text');

let chain = null;

function getChain() {
  if (!chain) {
    chain = searchParserPrompt.pipe(
      structured(getChatModel(), SearchQuerySchema, 'search_query')
    );
  }
  return chain;
}

async function parseSearchQuery(query, { signal } = {}) {
  const originalQuery = typeof query === 'string' ? query.trim() : '';
  const cacheKey = `ai:parse:${PROMPT_VERSION}:${sha256(originalQuery.toLowerCase())}`;

  const cached = await getJson(cacheKey);
  if (cached) return cached;

  return runAi(async () => {
    const raw = await getChain().invoke({ query: originalQuery }, { signal });
    const parsed = normalizeSearchQuery(raw, originalQuery);
    await setJson(cacheKey, parsed, CACHE_TTL_SECONDS.QUERY_PARSE);
    return parsed;
  });
}

module.exports = { parseSearchQuery };
