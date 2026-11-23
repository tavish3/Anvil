const { EMBEDDING_DIMENSIONS } = require('./constants');

function toVectorLiteral(arr) {
  if (!Array.isArray(arr) || arr.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding must be an array of ${EMBEDDING_DIMENSIONS} numbers`);
  }
  for (const value of arr) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('Embedding contains a non-finite number');
    }
  }
  return `[${arr.join(',')}]`;
}

module.exports = { toVectorLiteral };
