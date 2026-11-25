const { GoogleGenAI } = require('@google/genai');
const { aiConfig } = require('./config');
const { EMBEDDING_DIMENSIONS, EMBEDDING_INPUT_MAX_CHARS, CACHE_TTL_SECONDS } = require('./constants');
const { cleanText, truncate, sha256, formatEmbeddingInput } = require('./text');
const { l2Normalize } = require('./vector');
const { getJson, setJson } = require('./cache');

let client;
const getClient = () => {
  if (!client) client = new GoogleGenAI({ apiKey: aiConfig.apiKey });
  return client;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry only transient failures: HTTP 500/503/504 and network errors. Never 429 (quota) and never aborts/timeouts.
function isTransient(err) {
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError') return false;
  const code = err?.status ?? err?.statusCode;
  if ([500, 503, 504].includes(code)) return true;
  return err?.name === 'TypeError' && /fetch failed/i.test(String(err?.message));
}

async function embed({ role, text, title, signal }) {
  const input = truncate(cleanText(text), EMBEDDING_INPUT_MAX_CHARS);
  if (!input) throw new Error('Cannot embed empty text');

  const { contents, taskType } = formatEmbeddingInput({ model: aiConfig.embeddingModel, role, text: input, title });
  const signals = [AbortSignal.timeout(aiConfig.requestTimeoutMs)];
  if (signal) signals.push(signal);
  const config = { outputDimensionality: EMBEDDING_DIMENSIONS, abortSignal: AbortSignal.any(signals) };
  if (taskType) config.taskType = taskType;

  for (let attempt = 0; ; attempt += 1) {
    try {
      // `contents` MUST be a single string: an array is aggregated into ONE embedding by gemini-embedding-2.
      const res = await getClient().models.embedContent({ model: aiConfig.embeddingModel, contents, config });
      const values = res?.embeddings?.[0]?.values;
      if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Unexpected embedding response (expected ${EMBEDDING_DIMENSIONS} values)`);
      }
      return l2Normalize(values);
    } catch (err) {
      if (attempt >= 2 || !isTransient(err)) throw err;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

// Document role (jobs). Never cached.
function embedDocument(text, { title, signal } = {}) {
  return embed({ role: 'document', text, title, signal });
}

// Query role (search text, resumes). Cached in Redis unless { cache: false } (always use cache:false for resumes).
async function embedQuery(text, { cache = true, signal } = {}) {
  const input = truncate(cleanText(text), EMBEDDING_INPUT_MAX_CHARS);
  if (!input) throw new Error('Cannot embed empty text');
  const key = `ai:emb:${aiConfig.embeddingModel}:q:${sha256(input)}`;
  if (cache) {
    const hit = await getJson(key);
    if (Array.isArray(hit) && hit.length === EMBEDDING_DIMENSIONS) return hit;
  }
  const vector = await embed({ role: 'query', text: input, signal });
  if (cache) await setJson(key, vector, CACHE_TTL_SECONDS.EMBEDDING);
  return vector;
}

module.exports = { embedDocument, embedQuery };
