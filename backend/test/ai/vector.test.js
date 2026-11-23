const { test } = require('node:test');
const assert = require('node:assert/strict');

const { toVectorLiteral } = require('../../src/ai/vector');
const { EMBEDDING_DIMENSIONS } = require('../../src/ai/constants');

function makeVector(fill = 0.1) {
  return new Array(EMBEDDING_DIMENSIONS).fill(fill);
}

test('toVectorLiteral produces a pgvector literal', () => {
  const vec = makeVector(0.5);
  const lit = toVectorLiteral(vec);
  assert.ok(lit.startsWith('[') && lit.endsWith(']'));
  assert.equal(lit, `[${vec.join(',')}]`);
});

test('toVectorLiteral accepts varied finite numbers', () => {
  const vec = makeVector();
  vec[0] = -1.5e-10;
  vec[1535] = 3.14159;
  assert.ok(toVectorLiteral(vec).startsWith('[-1.5e-10'));
});

test('toVectorLiteral rejects wrong length', () => {
  assert.throws(() => toVectorLiteral(makeVector().slice(0, 100)), /1536/);
  assert.throws(() => toVectorLiteral([...makeVector(), 0.1]), /1536/);
  assert.throws(() => toVectorLiteral('not-an-array'), /1536/);
});

test('toVectorLiteral rejects non-finite numbers', () => {
  const nanVec = makeVector();
  nanVec[7] = NaN;
  assert.throws(() => toVectorLiteral(nanVec), /non-finite/);

  const infVec = makeVector();
  infVec[0] = Infinity;
  assert.throws(() => toVectorLiteral(infVec), /non-finite/);

  const strVec = makeVector();
  strVec[3] = '0.5';
  assert.throws(() => toVectorLiteral(strVec), /non-finite/);
});
