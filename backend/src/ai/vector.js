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

// Scales a vector to unit length (a zero vector is returned unchanged, as a copy).
function l2Normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (!norm) return vec.slice();
  return vec.map((v) => v / norm);
}

module.exports = { toVectorLiteral, l2Normalize };
