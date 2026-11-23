require('dotenv').config();

const { z } = require('zod');

const REASONING_EFFORTS = ['none', 'low', 'medium', 'high'];

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  AI_ENABLED: z.enum(['true', 'false']).default('true'),
  OPENAI_CHAT_MODEL: z.string().min(1).default('gpt-6-luna'),
  OPENAI_WRITING_MODEL: z.string().default(''),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default('text-embedding-3-small'),
  OPENAI_REASONING_EFFORT: z.string().optional(),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  AI_SEARCH_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.15),
  AI_DAILY_REQUEST_CAP: z.coerce.number().int().nonnegative().default(2000),
  AI_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
});

function invalidEnv(name, detail) {
  throw new Error(`Invalid environment variable ${name}: ${detail}`);
}

function parseReasoningEffort(raw) {
  // Variable absent => 'low'; present-but-empty => undefined (parameter not sent);
  // otherwise must be one of none|low|medium|high.
  if (raw === undefined) return 'low';
  if (raw === '') return undefined;
  if (REASONING_EFFORTS.includes(raw)) return raw;
  invalidEnv('OPENAI_REASONING_EFFORT', `expected one of ${REASONING_EFFORTS.join(', ')}, got "${raw}"`);
}

function buildConfig(env = {}) {
  // Treat empty strings as "unset" so .env.example-style empty values fall back
  // to defaults — except OPENAI_REASONING_EFFORT, where empty has its own meaning.
  const normalized = { ...env };
  for (const key of Object.keys(normalized)) {
    if (normalized[key] === '' && key !== 'OPENAI_REASONING_EFFORT') {
      normalized[key] = undefined;
    }
  }

  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    const issue = result.error.issues[0];
    invalidEnv(issue.path.join('.') || '(unknown)', issue.message);
  }
  const parsed = result.data;

  const apiKey = (parsed.OPENAI_API_KEY || '').trim();
  const enabled = parsed.AI_ENABLED === 'true';
  const chatModel = parsed.OPENAI_CHAT_MODEL;

  return {
    enabled,
    active: enabled && apiKey.length > 0,
    apiKey,
    chatModel,
    writingModel: parsed.OPENAI_WRITING_MODEL || chatModel,
    embeddingModel: parsed.OPENAI_EMBEDDING_MODEL,
    reasoningEffort: parseReasoningEffort(parsed.OPENAI_REASONING_EFFORT),
    requestTimeoutMs: parsed.AI_REQUEST_TIMEOUT_MS,
    searchMinScore: parsed.AI_SEARCH_MIN_SCORE,
    dailyRequestCap: parsed.AI_DAILY_REQUEST_CAP,
    workerConcurrency: parsed.AI_WORKER_CONCURRENCY,
  };
}

const aiConfig = Object.freeze(buildConfig(process.env));

module.exports = { aiConfig, buildConfig };
