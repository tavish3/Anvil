// Redis is required lazily so that importing this module never opens a
// connection (unit tests import pure modules only).
function getRedis() {
  return require('../config/redis');
}

async function getJson(key) {
  try {
    const raw = await getRedis().get(key);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('[AI Cache] get failed:', err.message);
    return null;
  }
}

async function setJson(key, value, ttlSeconds) {
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[AI Cache] set failed:', err.message);
  }
}

module.exports = { getJson, setJson };
