const redis = require('../config/redis');
const { aiConfig } = require('../ai/config');
const ApiError = require('../utils/ApiError');

// AI spec §10.1: every check fails open on Redis errors so a Redis outage never
// takes the API down with it.

const requireAiEnabled = (req, res, next) => {
  if (!aiConfig.active) {
    return next(new ApiError(503, 'AI features are not enabled'));
  }
  next();
};

const aiRateLimit = ({ name, limit, windowSeconds = 60 }) => async (req, res, next) => {
  try {
    const identity = req.user?.userId ?? req.ip;
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ai:rl:${name}:${identity}:${window}`;
    const [[, n]] = await redis.multi().incr(key).expire(key, windowSeconds + 5).exec();
    if (n > limit) {
      res.set('Retry-After', String(windowSeconds));
      return next(new ApiError(429, 'Too many requests. Please slow down and try again shortly.'));
    }
    next();
  } catch (err) {
    console.error(`[AI Guard] Rate limit check failed (${name}):`, err.message);
    next();
  }
};

const aiDailyBudget = async (req, res, next) => {
  try {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const key = `ai:daily:${day}`;
    const [[, n]] = await redis.multi().incr(key).expire(key, 90000).exec();
    if (n > aiConfig.dailyRequestCap) {
      return next(new ApiError(503, 'The daily AI usage limit has been reached. Please try again tomorrow.'));
    }
    next();
  } catch (err) {
    console.error('[AI Guard] Daily budget check failed:', err.message);
    next();
  }
};

module.exports = { requireAiEnabled, aiRateLimit, aiDailyBudget };
