const { aiConfig } = require('./config');
const { PROMPT_VERSION } = require('./constants');
const { sha256 } = require('./text');

// Content hash for a job document: a change to the document, the prompt version, the chat
// model or the embedding model produces a different hash and triggers regeneration.
function jobContentHash(document) {
  return sha256([document, PROMPT_VERSION, aiConfig.chatModel, aiConfig.embeddingModel].join('|'));
}

// A job is skipped only when nothing changed: not forced, previously READY with the same
// content hash, and an embedding already stored.
function shouldSkipJobProcessing({ force = false, insight, contentHash, hasEmbedding } = {}) {
  return !force && insight?.status === 'READY' && insight.contentHash === contentHash && hasEmbedding === true;
}

module.exports = { jobContentHash, shouldSkipJobProcessing };
