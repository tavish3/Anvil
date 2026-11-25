require('dotenv').config({ quiet: true });
const { z } = require('zod');

const THINKING_LEVELS = ['minimal', 'low', 'medium', 'high'];

// An empty string in .env (KEY=) means "use the default" for every setting except GEMINI_THINKING_LEVEL.
const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const num = (schema, def) => z.preprocess(emptyToUndefined, schema.default(def));
const str = (def) => z.preprocess(emptyToUndefined, z.string().default(def));

const envSchema = z.object({
  AI_ENABLED: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).default('true')),
  GEMINI_API_KEY: z.string().default(''),
  GOOGLE_API_KEY: z.string().default(''),
  GEMINI_CHAT_MODEL: str('gemini-3.5-flash-lite'),
  GEMINI_WRITING_MODEL: z.string().default(''),
  GEMINI_EMBEDDING_MODEL: z.preprocess(emptyToUndefined, z.enum(['gemini-embedding-2', 'gemini-embedding-001']).default('gemini-embedding-2')),
  GEMINI_THINKING_LEVEL: z.string().default('low'), // absent => 'low'; present-but-empty => not sent
  AI_REQUEST_TIMEOUT_MS: num(z.coerce.number().int().positive(), 60000),
  AI_SEARCH_MIN_SCORE: num(z.coerce.number().min(-1).max(1), 0),
  AI_DAILY_REQUEST_CAP: num(z.coerce.number().int().positive(), 100),
  AI_WORKER_CONCURRENCY: num(z.coerce.number().int().positive(), 1),
  AI_WORKER_RATE_PER_MINUTE: num(z.coerce.number().int().positive(), 6),
});

function buildConfig(env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Invalid AI configuration (${issue.path.join('.') || 'env'}): ${issue.message}`);
  }
  const e = parsed.data;

  const level = e.GEMINI_THINKING_LEVEL.trim().toLowerCase();
  if (level && !THINKING_LEVELS.includes(level)) {
    throw new Error(`Invalid AI configuration (GEMINI_THINKING_LEVEL): expected one of ${THINKING_LEVELS.join(', ')} or empty`);
  }

  const apiKey = (e.GEMINI_API_KEY || e.GOOGLE_API_KEY || '').trim();
  const enabled = e.AI_ENABLED === 'true';
  const chatModel = e.GEMINI_CHAT_MODEL;

  return {
    enabled,
    active: enabled && apiKey.length > 0,
    apiKey,
    chatModel,
    writingModel: e.GEMINI_WRITING_MODEL.trim() || chatModel,
    embeddingModel: e.GEMINI_EMBEDDING_MODEL,
    thinkingLevel: level || undefined,
    requestTimeoutMs: e.AI_REQUEST_TIMEOUT_MS,
    searchMinScore: e.AI_SEARCH_MIN_SCORE,
    dailyRequestCap: e.AI_DAILY_REQUEST_CAP,
    workerConcurrency: e.AI_WORKER_CONCURRENCY,
    workerRatePerMinute: e.AI_WORKER_RATE_PER_MINUTE,
  };
}

const aiConfig = Object.freeze(buildConfig(process.env));

module.exports = { aiConfig, buildConfig };
