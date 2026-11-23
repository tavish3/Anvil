const ApiError = require('../utils/ApiError');
const { aiConfig } = require('./config');
const { EMBEDDING_DIMENSIONS, EMBEDDING_INPUT_MAX_CHARS, CACHE_TTL_SECONDS } = require('./constants');
const { getEmbeddings } = require('./llm');
const { getJson, setJson } = require('./cache');
const { sha256, truncate } = require('./text');
const { runAi } = require('./errors');

function prepareInput(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new ApiError(400, 'Cannot embed empty input.');
  }
  return truncate(text, EMBEDDING_INPUT_MAX_CHARS);
}

function assertEmbedding(vec) {
  const valid = Array.isArray(vec)
    && vec.length === EMBEDDING_DIMENSIONS
    && vec.every((v) => typeof v === 'number' && Number.isFinite(v));
  if (!valid) {
    throw new ApiError(502, 'The AI service returned an invalid embedding.');
  }
  return vec;
}

async function embedDocument(text) {
  return runAi(async () => {
    const input = prepareInput(text);
    const vec = await getEmbeddings().embedQuery(input);
    return assertEmbedding(vec);
  });
}

async function embedQuery(text) {
  const input = prepareInput(text);
  const key = `ai:emb:${aiConfig.embeddingModel}:${sha256(input)}`;

  const cached = await getJson(key);
  if (Array.isArray(cached) && cached.length === EMBEDDING_DIMENSIONS) {
    return cached;
  }

  const vec = await embedDocument(text);
  await setJson(key, vec, CACHE_TTL_SECONDS.EMBEDDING);
  return vec;
}

module.exports = { embedDocument, embedQuery };
