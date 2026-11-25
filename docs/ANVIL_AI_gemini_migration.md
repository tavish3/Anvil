# Anvil — Migrating AI Phases 0–3 from OpenAI to Google Gemini

> **Purpose.** Phases AI-0 to AI-3 of `ANVIL_AI_implementation_plan.md` were implemented with **OpenAI**. The project now uses **Google Gemini (free tier)** and will not go back to OpenAI. This file tells a coding agent exactly how to convert the existing Phase 0–3 code. Afterwards the codebase is in the state described by the revised `ANVIL_AI_spec.md` (Gemini revision of 2026-11-24), and Phase AI-4 can start.
>
> **Scope:** only what Phases 0–3 created (packages, env template, `backend/src/ai/*`, the four chains, `scripts/ai-smoke.js`, unit tests). **No database change** (the `vector(1536)` columns stay valid — Gemini is asked for 1536 dimensions), **no schema/prompt/normalizer changes**, nothing from Phase AI-4 onward.
>
> **Prerequisite:** the developer has replaced the two AI documents in `docs/` with the Gemini revisions (`ANVIL_AI_spec.md`, `ANVIL_AI_implementation_plan.md`). The spec sections referenced below (§4.2, §6, §8.x) are authoritative; the code in §5 of *this* file was executed against mock Gemini servers (26 checks) and matches the spec.

---

## 1. Prompt to paste into the coding agent

```
You are working in my Anvil job-board repo. Read these files fully first:
- docs/ANVIL_AI_gemini_migration.md  (THIS task: follow it step by step)
- docs/ANVIL_AI_spec.md (revised for Gemini: §4.1, §4.2, §6, §8.x are authoritative)
- docs/ANVIL_AI_implementation_plan.md (for context only)
- docs/ANVIL_spec.md and docs/ANVIL_implementation_plan.md (base app, finished)

Task: migrate the already-implemented AI Phases 0-3 from OpenAI to Google Gemini by executing Steps M0-M11 of docs/ANVIL_AI_gemini_migration.md, in order.

Rules:
1. Touch only what the migration steps list. Do not start Phase AI-4 or anything later. Do not change the database, Prisma schema, prompts, zod schemas, normalizers, or any non-AI code.
2. Dependencies: remove @langchain/openai; install ONLY @langchain/google and @google/genai. Do NOT add @langchain/google-genai, @langchain/google-vertexai, openai, langchain, pg, pgvector or anything else. If you think another package is needed, stop and ask me.
3. The reference code in section 5 of the migration file is tested; use it as given (adapting only import paths if your existing files differ). If the spec and the real code disagree, trust the real code, tell me, and make the smallest sensible adjustment.
4. Do not open, print or edit backend/.env, and never print my API key anywhere (commands such as npm run ai:smoke may load it; that is fine). I will edit .env myself.
5. After each step run the step's checks (npm test where stated). If a check needs my Gemini key or Docker and you cannot run it, do not claim it passed: list it under "Manual checks for the developer".
6. When finished, stop and give me the final report in the format of section 7. Do not continue to the next phase.
```

---

## 2. What changes and what does not

| Area | Change |
|---|---|
| `backend/package.json` | remove `@langchain/openai`; add `@langchain/google`, `@google/genai` (Node requirement unchanged: ≥ 22.3) |
| `backend/.env.example` | `OPENAI_*` block → Gemini block (spec §6) |
| `src/ai/constants.js` | `EMBEDDING_INPUT_MAX_CHARS` 24000→6000, `PROMPT_VERSION` `'v1'`→`'v2'`, new `WORKER_RATE_LIMIT_PAUSE_MS` |
| `src/ai/config.js` | new env names and `thinkingLevel` / `workerRatePerMinute` (reference A) |
| `src/ai/errors.js` | Gemini error shapes, `isRateLimitError`, `getRetryDelayMs`, `EmptyModelOutputError` (reference B) |
| `src/ai/vector.js`, `src/ai/text.js` | add `l2Normalize`, `formatEmbeddingInput` (references C, D) |
| `src/ai/llm.js` | `ChatGoogle` factory, `callOptions`, `getText`; **no** embeddings here any more (reference E) |
| `src/ai/embeddings.js` | `@google/genai` embeddings with query/document roles (reference F) |
| 4 chains | `.invoke(input, callOptions(signal))`; cache keys include the chat model |
| `scripts/ai-smoke.js`, `test/ai/*` | updated for Gemini |
| **Unchanged** | DB schema/migrations, `prompts.js`, `schemas.js`, `normalize.js`, `pdf.js`, `cache.js`, `buildJobDocument`, all later-phase files (none exist yet) |

Gemini facts the code relies on (details in spec §4.2, all verified): `ChatGoogle` ignores its `timeout` option (use a per-call `AbortSignal`), plain text must be read from `message.text` (never `StringOutputParser`), structured output uses `method: 'jsonSchema'`, errors expose `statusCode` (ChatGoogle) or `status` (`@google/genai`), 429 means quota, and embeddings take a text prefix for the retrieval role instead of `taskType` on `gemini-embedding-2`.

---

## 3. Before you start (developer checklist)

1. Commit or stash everything; create a branch: `git checkout -b gemini-migration`.
2. Get a key at <https://aistudio.google.com/apikey>. Open <https://aistudio.google.com/rate-limit> and look at the limits for `gemini-3.5-flash-lite` and `gemini-embedding-2` (the docs no longer publish free-tier numbers). If either model is not available to your project, pick another available model and set it in `.env` later.
3. **Data warning:** on the free tier Google may use prompts and responses to improve its products. Use only fictional resumes/jobs while developing; enable billing before real users upload resumes (spec §17).
4. In `backend/.env` (you, not the agent): delete every `OPENAI_*` line, add `GEMINI_API_KEY=<your key>`. Optional lines are in spec §6; leaving them out uses the defaults.

---

## 4. Steps

### M0 — Inventory (read-only)
Run from the repo root and report the list of files; do not edit anything yet:
```
grep -rniE "openai|gpt-|reasoning|strict|StringOutputParser|temperature|getEmbeddings" backend/src backend/scripts backend/test backend/package.json backend/.env.example
```
The expected files are those named in section 2. If other files appear (other than comments), tell the developer before continuing.

### M1 — Packages and env template
```
cd backend
npm uninstall @langchain/openai
npm install @langchain/google @google/genai
node -e "require('@langchain/core/prompts'); require('@langchain/google/node'); require('@google/genai'); require('@langchain/langgraph'); const { PDFParse } = require('pdf-parse'); console.log('CJS imports OK', typeof PDFParse)"
```
Also remove the `openai` package if it is present in `package.json` (it should not be). Then replace the OpenAI block at the end of `backend/.env.example` with the Gemini block of **spec §6** (copy it verbatim, including the comments). Keep the other lines of that file untouched.

**Done when:** the one-liner prints `CJS imports OK function`; `package.json` lists `@langchain/google` and `@google/genai` and no `@langchain/openai`.

### M2 — `constants.js`
Three edits (everything else stays):
- `EMBEDDING_INPUT_MAX_CHARS: 24000,` → `EMBEDDING_INPUT_MAX_CHARS: 6000,   // ≈1.5k tokens: inside the limits of both Gemini embedding models`
- add `WORKER_RATE_LIMIT_PAUSE_MS: 60000, // minimum queue pause after a Gemini 429 (spec §9.2)` next to `GRAPH_RECURSION_LIMIT`
- `PROMPT_VERSION: 'v1'` → `PROMPT_VERSION: 'v2', // 'v1' = OpenAI era; bump to invalidate caches and regenerate insights`

### M3 — `config.js`
Replace the whole file with **reference A** (§5). Search the repo for any code that reads removed fields (`reasoningEffort`, `OPENAI_*`) and update it (there should be none outside `llm.js`, `smoke`, tests).

### M4 — `errors.js`
Replace the whole file with **reference B**. Existing exports (`toApiError`, `runAi`) keep their names and meaning.

### M5 — `vector.js` and `text.js`
- `vector.js`: add **reference C** (`l2Normalize`) and export it next to `toVectorLiteral`.
- `text.js`: add **reference D** (`formatEmbeddingInput`) and export it. Nothing else in `text.js` changes.

### M6 — `llm.js` and `embeddings.js`
- Replace `llm.js` with **reference E**. If any file still imports `getEmbeddings` from `llm.js`, change it to use `embeddings.js` (reference F) instead.
- Replace `embeddings.js` with **reference F**.
- `cache.js` stays as it is.

### M7 — Chains (`src/ai/chains/*.chain.js`, four files)
For each chain:
1. Import `callOptions` from `../llm` and change every `.invoke(input, { signal })` to `.invoke(input, callOptions(signal))` (also when `signal` is `undefined`). No model call may be made without `callOptions`.
2. Remove anything OpenAI-specific (`strict: true`, a `name` option passed to anything but `structured()`, `temperature`). `structured(model, Schema, 'name')` keeps its signature.
3. Cache keys include the chat model (spec §8.5):
   - parse: `` `ai:parse:${PROMPT_VERSION}:${aiConfig.chatModel}:${sha256(normalizedQuery)}` ``
   - fit: `` `ai:fit:${PROMPT_VERSION}:${aiConfig.chatModel}:${resume.textHash}:${jobDocHash}` ``
4. Prompts, zod schemas and normalizers are **not** modified.

### M8 — `scripts/ai-smoke.js`
Update per **spec §18.1** (checks 1–5; the `--full` stub stays a stub):
- requires `GEMINI_API_KEY` (message: "Set GEMINI_API_KEY in backend/.env"), prints the chat/embedding model names it uses;
- check 1 (embeddings): `embedQuery('hello', { cache: false })` and `embedDocument('a job text', { title: 'Engineer' })` each return 1536 finite numbers of unit length (±0.01) and the two vectors are not identical;
- checks 2–5 unchanged in intent (search parsing: `locationType === 'REMOTE'`, `salaryMin === 1000000`; job insights; resume profile; fit analysis);
- **new check 6 (plain text):** `getText(await getChatModel().invoke('Reply with exactly the word OK.', callOptions()))` returns a non-empty string without throwing;
- it must still close Redis and exit.
On a 429 the script should print "quota exceeded — wait a minute or check https://aistudio.google.com/rate-limit" instead of a stack trace.

### M9 — Unit tests (`backend/test/ai/*.test.js`)
Keep every existing test that still applies and update:
- `config.test.js`: new env names — no key ⇒ inactive; `GOOGLE_API_KEY` fallback; `AI_ENABLED=false`; thinking level absent ⇒ `'low'`, present-but-empty ⇒ `undefined`, `MINIMAL` ⇒ `'minimal'`, `extreme` ⇒ throws; empty numeric variable ⇒ default; `GEMINI_EMBEDDING_MODEL=text-embedding-3-small` ⇒ throws; writing model empty ⇒ chat model.
- `errors.test.js`: `statusCode` vs `status`; 429 ⇒ 503 and `isRateLimitError`; `PromptBlockedError` ⇒ 422; timeouts/aborts ⇒ 504; unknown ⇒ 502; an app `ApiError` passes through unchanged; `getRetryDelayMs` for a `RetryInfo` detail of `"12.5s"` ⇒ `12500` and `null` when absent.
- `vector.test.js`: add `l2Normalize([3,4])` ⇒ `[0.6,0.8]` and the zero vector.
- `text.test.js`: add `formatEmbeddingInput` for v2 document (with/without title), v2 query, and `-001` task types.
Do not add tests that need the network, Redis or a database.

### M10 — Stale data
- Redis caches from the OpenAI era must go (embeddings from another model, old parse/fit results). With Docker running: `docker exec job-board-redis sh -c "redis-cli --scan --pattern 'ai:*' | xargs -r redis-cli del"`.
- Database: confirm the vector size is still 1536 and nothing was embedded yet (Phase AI-4 has not run): `docker exec job-board-postgres psql -U jobboard -d jobboard -c "SELECT count(*) FROM \"JobInsight\";"` should be `0`. If it is not 0 (insights/embeddings already exist), report it to the developer instead of deleting anything. (If your shell mangles the quotes in that command — for example Windows PowerShell — open psql interactively with `docker exec -it job-board-postgres psql -U jobboard -d jobboard` and run `SELECT count(*) FROM "JobInsight";` there.)

### M11 — Final verification and cleanup
1. `cd backend && npm test` — all green.
2. `grep -rniE "openai|gpt-|reasoningEffort|thinkingBudget|StringOutputParser|getEmbeddings|temperature" backend/src backend/scripts backend/test backend/package.json backend/.env.example` — only intentional hits may remain (for example a unit test asserting that a legacy value is rejected, or a comment explaining why StringOutputParser is forbidden). Explain every remaining hit.
3. Start the server **without** a key (`GEMINI_API_KEY` empty): `npm run dev` boots, `curl localhost:5000/health` and `curl localhost:5000/api/jobs` work, and `node -e "const c=require('./src/ai/config'); console.log(c.aiConfig.active)"` prints `false`. Requiring `src/ai/llm.js` and `src/ai/embeddings.js` must not throw.
4. With the developer's key (manual if you cannot run it): `npm run ai:smoke` — all checks PASS. If a check fails because a model is unavailable or over quota, report the exact message; do not change model names yourself.
5. Commit: `git commit -am "Migrate AI phases 0-3 from OpenAI to Gemini"`.

---

## 5. Reference code (tested)

All six files below were executed against mock Gemini endpoints: config parsing (empty vs absent variables, invalid values), error mapping for both SDK error shapes, `thinkingLevel: LOW` + JSON-mode request shape, thought-summary parts excluded by `getText`, empty-response handling, per-call timeouts and aborts, embedding request shape (prefix, no `taskType`, 1536 dimensions, one string per call), unit-length output, query caching, retry of a 503, no retry of a 429, and abort of a hung embedding call.

### Reference A — `backend/src/ai/config.js`
```js
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
```

### Reference B — `backend/src/ai/errors.js`
```js
const ApiError = require('../utils/ApiError');

class EmptyModelOutputError extends Error {
  constructor(message = 'The AI model returned an empty response.') {
    super(message);
    this.name = 'EmptyModelOutputError';
  }
}

// ChatGoogle (RequestError) puts the HTTP code in `statusCode`; @google/genai (ApiError) in `status`.
const httpCode = (err) => err?.statusCode ?? err?.status ?? err?.response?.status ?? null;

// Google error bodies: RequestError => err.data.error ; @google/genai ApiError => JSON string in err.message
function googleErrorBody(err) {
  if (err?.data?.error && typeof err.data.error === 'object') return err.data.error;
  try {
    const parsed = JSON.parse(String(err?.message ?? ''));
    if (parsed && typeof parsed.error === 'object') return parsed.error;
  } catch (_) { /* not JSON */ }
  return null;
}

function isRateLimitError(err) {
  if (httpCode(err) === 429) return true;
  const body = googleErrorBody(err);
  return body?.status === 'RESOURCE_EXHAUSTED';
}

// Milliseconds suggested by Google (RetryInfo detail such as "31s"), or null.
function getRetryDelayMs(err) {
  const details = googleErrorBody(err)?.details;
  if (Array.isArray(details)) {
    for (const d of details) {
      if (typeof d?.['@type'] === 'string' && d['@type'].endsWith('RetryInfo') && typeof d.retryDelay === 'string') {
        const seconds = parseFloat(d.retryDelay);
        if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
      }
    }
  }
  return null;
}

function toApiError(err) {
  if (err instanceof ApiError) return err;
  console.error('[AI] provider error:', String(err?.message ?? err).slice(0, 300));
  const msg = String(err?.message ?? '');
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || /timed out|aborted/i.test(msg)) {
    return new ApiError(504, 'The AI request timed out. Please try again.');
  }
  if (isRateLimitError(err)) {
    return new ApiError(503, 'The AI service is busy right now. Please try again shortly.');
  }
  if (err?.name === 'PromptBlockedError') {
    return new ApiError(422, 'This content could not be processed by the AI service.');
  }
  return new ApiError(502, 'The AI service failed to respond. Please try again.');
}

async function runAi(fn) {
  try {
    return await fn();
  } catch (err) {
    throw toApiError(err);
  }
}

module.exports = { EmptyModelOutputError, toApiError, runAi, isRateLimitError, getRetryDelayMs };
```

### Reference C — add to `backend/src/ai/vector.js` (and export it)
```js
// Scales a vector to unit length (a zero vector is returned unchanged, as a copy).
function l2Normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (!norm) return vec.slice();
  return vec.map((v) => v / norm);
}
```

### Reference D — add to `backend/src/ai/text.js` (and export it)
```js
// Pure: how text is presented to the embedding model for a given role.
//  gemini-embedding-2  -> no taskType; the role is expressed with text prefixes
//  gemini-embedding-001 -> raw text + taskType
function formatEmbeddingInput({ model, role, text, title }) {
  if (/embedding-2/.test(model)) {
    return {
      contents: role === 'query' ? `task: search result | query: ${text}` : `title: ${title || 'none'} | text: ${text}`,
      taskType: undefined,
    };
  }
  return { contents: text, taskType: role === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT' };
}
```

### Reference E — `backend/src/ai/llm.js`
```js
const { ChatGoogle } = require('@langchain/google/node');
const { aiConfig } = require('./config');
const { EmptyModelOutputError } = require('./errors');

let chatModel;
let writingModel;

function build(model) {
  // NEVER pass temperature, timeout (ignored by ChatGoogle), endpoint, reasoningEffort or thinkingBudget.
  const options = { model, apiKey: aiConfig.apiKey, platformType: 'gai', maxRetries: 2 };
  if (aiConfig.thinkingLevel) options.thinkingLevel = aiConfig.thinkingLevel;
  return new ChatGoogle(options);
}

function getChatModel() {
  if (!chatModel) chatModel = build(aiConfig.chatModel);
  return chatModel;
}

function getWritingModel() {
  if (aiConfig.writingModel === aiConfig.chatModel) return getChatModel();
  if (!writingModel) writingModel = build(aiConfig.writingModel);
  return writingModel;
}

const structured = (model, schema, name) => model.withStructuredOutput(schema, { method: 'jsonSchema', name });

// ChatGoogle ignores its `timeout` option, so EVERY invocation must carry an AbortSignal.
function callOptions(signal) {
  const signals = [AbortSignal.timeout(aiConfig.requestTimeoutMs)];
  if (signal) signals.push(signal);
  return { signal: AbortSignal.any(signals) };
}

// `message.text` excludes thought-summary blocks (StringOutputParser does NOT - never use it with Gemini).
function getText(message) {
  const text = typeof message?.text === 'string' ? message.text.trim() : '';
  if (!text) throw new EmptyModelOutputError();
  return text;
}

module.exports = { getChatModel, getWritingModel, structured, callOptions, getText };
```

### Reference F — `backend/src/ai/embeddings.js`
```js
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
```

If your existing `cache.js` exports `getJson`/`setJson` under those names (spec §8.5), reference F works unchanged. Adjust only import paths if your files differ.

---

## 6. Verification checklist

| # | Check | Expected |
|---|---|---|
| 1 | `npm test` in `backend/` | all green |
| 2 | CJS import one-liner (M1) | prints `CJS imports OK function` |
| 3 | `package.json` | has `@langchain/google`, `@google/genai`; no `@langchain/openai`/`openai` |
| 4 | Boot with no key | server runs; `/health`, `/api/jobs` work; `aiConfig.active === false` |
| 5 | `grep` of M11 step 2 | only explained hits |
| 6 | `npm run ai:smoke` (with key) | all PASS incl. plain-text check |
| 7 | Redis `ai:*` keys | cleared (M10) |
| 8 | `JobInsight` row count | `0` and column type still `vector(1536)` |
| 9 | `git diff --stat` | only the files in section 2 changed |

---

## 7. Final report format (the agent must answer with this)

1. Files created / modified / deleted (one line each).
2. Commands run and their results (include `npm test` totals and the grep output of M11).
3. **Manual checks for the developer** (smoke test with the key, Docker/Redis steps you could not run, `.env` editing).
4. Deviations from this file or the spec, and why.
5. Anything surprising (for example: files with OpenAI references not listed in section 2).

---

## 8. Rollback and troubleshooting

- **Undo everything:** `git checkout main && git branch -D gemini-migration` (the OpenAI-era code is untouched on `main`).
- **`429` / "quota exceeded"** during smoke: wait a minute, then retry; check your limits at <https://aistudio.google.com/rate-limit>. A daily-quota 429 clears after midnight Pacific time.
- **"model not found" / 404:** the model ID is unavailable for your project. Pick an available one in AI Studio and set `GEMINI_CHAT_MODEL` (or `GEMINI_WRITING_MODEL`) in `.env`. `gemini-3.5-flash-lite` and `gemini-embedding-2` are the defaults.
- **Schema rejected (400 INVALID_ARGUMENT)** on a structured call: report the exact message to the developer. Do not weaken the schemas on your own.
- **Embedding dimension error:** the code requests 1536 dimensions; if the API returns another size, report it instead of changing the database.
