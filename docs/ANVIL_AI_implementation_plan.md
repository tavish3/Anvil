# Anvil — AI Features Implementation Plan

> Companion to `ANVIL_AI_spec.md` (the **AI spec**) and the finished `ANVIL_spec.md` / `ANVIL_implementation_plan.md` (the **base spec/plan**, Phases 0–17, all complete).
>
> Each phase is self-contained and agent-executable. At the start of every session give the agent: **`ANVIL_spec.md` + `ANVIL_AI_spec.md` + this file**, tell it which phase to implement, and do not skip or reorder phases. Section references (§) point into `ANVIL_AI_spec.md`. Phases are named `AI-0 … AI-15` so they never collide with the base plan's Phase 0–17.

---

## Rules that apply to EVERY phase (the agent must follow these)

1. **Implement only the phase you were given.** Phases build on each other; assume earlier ones are done and working.
2. **Additive only.** Do not modify any existing file except where §16 of the AI spec explicitly lists it (and only the listed change). Do **not** fix the pre-existing issues listed in §20 — mention them in the report instead.
3. **Conventions:** backend = CommonJS (`require`/`module.exports`), plain JS, 2 spaces, single quotes, semicolons, `asyncHandler`, `ApiResponse`, `ApiError`, module layout `<name>.routes/controller/service/schema.js`. Frontend = ESM React 19, Tailwind 3, TanStack Query v5, `react-router-dom`, `react-hot-toast`, axios instance from `src/api/axios.js`. Match the surrounding code style.
4. **Dependencies:** install only what §4.1 lists. Do **not** install `langchain`, `@langchain/community`, `openai`, `pg`, `pgvector`, `pdfjs-dist`.
5. **AI-inactive safety:** the backend must still boot and every existing feature must still work with no `OPENAI_API_KEY` (§6). Never construct `ChatOpenAI`/`OpenAIEmbeddings` at module load; create them lazily.
6. **Secrets:** never write the OpenAI key into any tracked file or log. It lives only in `backend/.env` (already git-ignored).
7. **Never use `req.query =` or the old `validate` middleware for new AI routes** — use `validateRequest` and `req.validated.*` (§10.3).
8. **Verification before reporting done:** run the phase's "Done when" checks. From phase AI-2 onward also run `npm test` in `backend/`; from AI-5 onward start the server (`npm run dev`) and exercise the endpoints with `curl`. If a check needs an `OPENAI_API_KEY` that is not available in your environment, **say so explicitly** and list it under "Manual checks for the developer" instead of claiming it passed.
9. **Final report format:** (a) files created, (b) files modified (with a one-line description each), (c) commands run and their results, (d) manual checks for the developer, (e) any deviation from the spec and why.

---

## Phase AI-0 — Prerequisites & infrastructure

**Goal:** Postgres with pgvector, Node ≥ 22.3, AI packages installed, env template and proxy setting in place. No feature code yet.

**Prompt:**
````
You are implementing Phase AI-0 of the Anvil AI features. Specs: ANVIL_spec.md (base) and ANVIL_AI_spec.md (addendum). Base phases 0-17 are complete.

Do the following (see AI spec §4, §6, §16, §19):
1. Check `node -v` is >= 22.3 (required by @langchain/openai and pdf-parse). If it is lower, STOP and report - the developer must upgrade Node (and the Docker/VPS base image) first. Add `"engines": { "node": ">=22.3.0" }` to backend/package.json.
2. In docker-compose.yml change ONLY the postgres image from `postgres:15` to `pgvector/pgvector:pg15` (keep container name, env, ports, volume, healthcheck). Run `docker compose pull postgres && docker compose up -d postgres redis`.
3. Verify the extension is available:
   docker exec job-board-postgres psql -U jobboard -d jobboard -c "SELECT name, default_version FROM pg_available_extensions WHERE name = 'vector';"
   It must return one row. Also confirm the existing data is still there (e.g. `SELECT count(*) FROM "Job";` works).
4. In backend/: `npm install @langchain/core @langchain/openai @langchain/langgraph pdf-parse`. Keep the resolved caret ranges. pdf-parse must be the v2 API (2.x): `const { PDFParse } = require('pdf-parse')`.
5. Verify all packages load in CommonJS (no ESM errors):
   node -e "require('@langchain/core/prompts'); require('@langchain/core/output_parsers'); require('@langchain/openai'); require('@langchain/langgraph'); const { PDFParse } = require('pdf-parse'); console.log('CJS imports OK', typeof PDFParse)"
6. Edit backend/package.json scripts: set "test" to `node --test` (no path argument: `node --test test/` FAILS on Node 22; the bare form auto-discovers `*.test.js` files) and add "ai:smoke": "node scripts/ai-smoke.js" and "ai:backfill": "node scripts/ai-backfill.js" (the scripts/test folders are created in later phases; create an empty backend/test/ai/.gitkeep and backend/scripts/.gitkeep so the paths exist).
7. Append the AI block from AI spec §6 verbatim to backend/.env.example (all values empty/default as shown, with the comments).
8. In backend/src/app.js, directly after `const app = express();` add:
     const hops = parseInt(process.env.TRUST_PROXY, 10);
     if (hops > 0) app.set('trust proxy', hops);
   Change nothing else in app.js in this phase.

Do not create any AI feature code in this phase.
````

**Done when:**
- `pg_available_extensions` returns the `vector` row; existing tables/data intact.
- The CJS import one-liner prints `CJS imports OK function`.
- `npm run dev` boots with no OpenAI key and `curl localhost:5000/health` and `curl localhost:5000/api/jobs` still work.

---

## Phase AI-1 — Database: `JobInsight` and `Resume`

**Goal:** Prisma models, enum, pgvector columns and HNSW index created via a reviewed migration.

**Prompt:**
````
You are implementing Phase AI-1 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phase AI-0 is complete (pgvector is available).

Do the following (AI spec §7):
1. Edit backend/prisma/schema.prisma exactly as in §7.1: add `previewFeatures = ["postgresqlExtensions"]` to the generator, `extensions = [vector]` to the datasource, the `AiProcessingStatus` enum, the `JobInsight` and `Resume` models (with `Unsupported("vector(1536)")?` embedding columns), and the reverse relations `insight JobInsight?` on Job and `resume Resume?` on User. Change nothing else.
2. Run `npx prisma migrate dev --name add_ai_features --create-only`.
3. Open the generated migration.sql and make sure it contains everything in §7.2 — in particular `CREATE EXTENSION IF NOT EXISTS vector;` (it may be emitted as "vector" quoted — either is fine) and the manual statement
   CREATE INDEX "JobInsight_embedding_hnsw_idx" ON "JobInsight" USING hnsw ("embedding" vector_cosine_ops);
   which Prisma cannot generate: add it at the end of the file. Remove nothing else Prisma generated.
4. Apply: `npx prisma migrate dev` then `npx prisma generate`.
5. Drift check: run `npx prisma migrate dev --create-only --name drift_check`. If it generates a migration that only drops the HNSW index (or is empty / says already in sync), delete that new migration folder (do NOT apply a migration that drops the index). The final migrations folder must contain only the init, add_notifications and add_ai_features migrations.
6. Verify with psql (docker exec job-board-postgres psql -U jobboard -d jobboard):
   - `\d "JobInsight"` and `\d "Resume"` show the vector(1536) column; `\di` lists "JobInsight_embedding_hnsw_idx" using hnsw.
   - `SELECT '[1,2,3]'::vector;` works.
7. Verify the Prisma client: `node -e "const p=require('./src/config/db'); console.log(typeof p.jobInsight.findMany, typeof p.resume.findMany); p.\$disconnect()"` prints `function function`.
8. Verify nothing else changed: `curl localhost:5000/api/jobs` still returns jobs with the same fields as before (no `insight` or `embedding` fields appear).

Do not run the seed script. Do not write any feature code.
````

**Done when:**
- Migration applied; both tables exist; HNSW index exists; `prisma.jobInsight` and `prisma.resume` exist in the client.
- `migrate dev` reports no pending changes other than (possibly) the HNSW drop, which was discarded.
- Existing `GET /api/jobs` output is unchanged.

---

## Phase AI-2 — AI core library (config, utils, embeddings, schemas, normalizers)

**Goal:** the pure and infrastructural building blocks of `backend/src/ai/`, unit-tested without network access.

**Prompt:**
````
You are implementing Phase AI-2 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0 and AI-1 are complete.

Create these files in backend/src/ai/ exactly as specified in AI spec §8 (read §8.2-§8.9 fully; they are authoritative):
1. constants.js  (§8.2, copy the object verbatim)
2. config.js     (§8.3, §6) - loads dotenv, Zod-validates env, exports BOTH `aiConfig` (frozen) and a pure `buildConfig(env)`; `active = enabled && apiKey non-empty`; OPENAI_REASONING_EFFORT: variable absent => 'low', present-but-empty => `reasoningEffort: undefined`, otherwise one of none|low|medium|high; OPENAI_WRITING_MODEL empty => chat model.
3. errors.js     (§8.4) - toApiError + runAi. Use the existing utils/ApiError.
4. cache.js      (§8.5) - getJson/setJson using config/redis.js; never throw.
5. llm.js        (§8.6) - lazy singletons getChatModel / getWritingModel / getEmbeddings and `structured(model, schema, name)`. ChatOpenAI options: { model, apiKey, maxRetries: 2, timeout } plus `reasoning: { effort }` ONLY when aiConfig.reasoningEffort is set. NEVER pass `temperature`. Use `withStructuredOutput(schema, { method: 'jsonSchema', strict: true, name })`. OpenAIEmbeddings: { model, apiKey, dimensions: 1536, batchSize: 64, maxRetries: 2, timeout }. Nothing may be constructed at require-time.
6. text.js       (§8.7) - sha256, cleanText, stripPdfPageMarkers, truncate, wordCount, escapeLike, buildJobDocument, buildResumeEmbeddingText.
7. vector.js     (§8.7) - toVectorLiteral (validate length 1536 and finite numbers).
8. embeddings.js (§8.7) - embedDocument (no cache) and embedQuery (Redis cache `ai:emb:<model>:<sha256>`, TTL from constants); truncate input to EMBEDDING_INPUT_MAX_CHARS; reject empty input; validate returned length.
9. pdf.js        (§8.7) - extractPdfText(buffer) using `const { PDFParse } = require('pdf-parse')`: `new PDFParse({ data: buffer })`, `getText({ first: RESUME_MAX_PDF_PAGES })` raced against PDF_PARSE_TIMEOUT_MS, always `await parser.destroy()` in finally, strip page markers BEFORE measuring length, throw the two ApiError(422) messages from §8.7.
10. schemas.js   (§8.9) - the Zod schemas exactly as written (all fields required, `.nullable()` instead of optional, no .int()/.min()/.max()/.default()).
11. normalize.js (§8.9) - normalizeList, normalizeJobInsights, normalizeSearchQuery, normalizeResumeProfile, normalizeFitAnalysis, scoreToVerdict, normalizeTips with the exact clamping rules in §8.9 and LIST_LIMITS from constants.

Then write unit tests in backend/test/ai/ using `node:test` and `node:assert/strict` (no network, no DB, no Redis connection required - do not require modules that open a Redis connection at load time in tests; if a module under test requires config/redis.js, structure the code so the pure functions live in files that do not, or lazy-require redis inside the functions):
- text.test.js, vector.test.js, normalize.test.js, config.test.js, errors.test.js as listed in AI spec §18.3 (include the boundaries 34/35/54/55/74/75 for scoreToVerdict; the real pdf-parse page marker format "\n\n-- 1 of 3 --\n\n"; salary swap/rounding; `remote` location => null; empty semanticQuery falls back to the original query).
PDF extraction is NOT unit-tested here (it needs real PDF files); it is verified manually in AI-7.

Run `npm test` in backend/ and make it pass. Do not create queues, routes, chains or prompts yet.
````

**Done when:**
- `npm test` passes (all unit tests green).
- `node -e "require('./src/ai/config')"` works with and without `OPENAI_API_KEY` set, and `aiConfig.active` is `false` without a key.
- Requiring `src/ai/llm.js` with no key does **not** throw (only calling the getters does).

---

## Phase AI-3 — Prompts, chains and the live smoke script

**Goal:** all prompts plus the four single-call chains (job insights, search parsing, resume profile, fit analysis), and a script that proves them against the real OpenAI API.

**Prompt:**
````
You are implementing Phase AI-3 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-2 are complete.

1. Create backend/src/ai/prompts.js containing ALL prompts from AI spec §14 (14.1-14.8) as exported `ChatPromptTemplate` objects (or builder functions where numbers/tone must be interpolated): system text verbatim from the spec, human templates verbatim. In template text literal braces must be doubled (`{{ }}`); interpolate FIT_BANDS numbers into the fit prompt string BEFORE creating the template. Export the tone map (PROFESSIONAL / ENTHUSIASTIC / CONCISE => tone_instruction, length_instruction, minWords, maxWords: 220/320, 220/320, 150/200).
2. Create the chains (AI spec §12, §8.6), each building its runnable lazily on first call and caching it in a module variable, each accepting `{ signal }` and passing it to `.invoke(input, { signal })`:
   - chains/jobInsights.chain.js     => generateJobInsights(document, { signal })  -> normalizeJobInsights(raw)
   - chains/searchParser.chain.js    => parseSearchQuery(query, { signal }) -> { semanticQuery, filters }; Redis cache `ai:parse:<PROMPT_VERSION>:<sha256(lowercased trimmed query)>` (TTL QUERY_PARSE); uses normalizeSearchQuery(raw, originalQuery)
   - chains/resumeProfile.chain.js   => extractResumeProfile(resumeText, { signal }) -> normalizeResumeProfile; input truncated to RESUME_PROMPT_MAX_CHARS
   - chains/fitAnalysis.chain.js     => analyzeFit({ document, resumeText, signal }) -> normalizeFitAnalysis (includes verdict); and getFitAnalysis({ job, employerName, resume /* { text, textHash } */, signal }) -> { analysis, cached } with cache key `ai:fit:<PROMPT_VERSION>:<resume.textHash>:<sha256(buildJobDocument(job, employerName))>` (TTL FIT)
   Chain pattern: `prompt.pipe(structured(getChatModel(), Schema, 'name'))`.
3. Create backend/scripts/ai-smoke.js per AI spec §18.1 (checks 1-5; add the `--full` flag handling as a stub that prints "graph checks are added in phase AI-9" for now). Inline fictional sample job + resume data. The script must exit non-zero if any check fails and print PASS/FAIL with durations. It must close Redis (and anything else holding the event loop open) so the process exits.
4. Add unit tests for any new pure helpers you introduce (e.g. the tone map). Keep `npm test` green.

Redis must be running (docker compose up -d redis) because the chains use the Redis cache. If OPENAI_API_KEY is available, run `npm run ai:smoke` and fix any failure (typical causes: a schema keyword rejected by strict mode, a model parameter rejected - see AI spec §4.2). If the key is NOT available, say so and list `npm run ai:smoke` under "Manual checks for the developer".
````

**Done when:**
- `npm test` passes.
- With a key: `npm run ai:smoke` prints PASS for all five checks.
- Requiring any chain module without a key does not throw at load time.

---

## Phase AI-4 — Queue, worker, job hooks, backfill (F1 pipeline + embeddings)

**Goal:** jobs get insights + embeddings asynchronously; resumes get profiles + embeddings; existing jobs can be backfilled.

**Prompt:**
````
You are implementing Phase AI-4 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-3 are complete.

1. Create backend/src/ai/repository.js with ONLY these functions for now (AI spec §8.8; use Prisma.sql / $queryRaw / $executeRaw; quote identifiers; vectors via toVectorLiteral + `::vector`):
   hasJobEmbedding(jobId), setJobEmbedding(db, jobId, vec), setResumeEmbedding(db, userId, textHash, vec) (returns affected rows), clearResumeEmbedding(db, userId).
   (`db` is the prisma client or a transaction client.)
2. Create backend/src/queues/ai.queue.js (AI spec §9.1): aiQueue created only when aiConfig.active; defaultJobOptions { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: { count: 200 } } on the QUEUE; export enqueueJobProcessing(jobId, { force }) and enqueueResumeProcessing(userId); both are no-ops returning false when inactive and NEVER throw.
3. Create backend/src/queues/ai.worker.js (AI spec §9.2): Worker 'ai' with concurrency aiConfig.workerConcurrency and limiter { max: 30, duration: 60000 }; implement `process-job` and `process-resume` exactly as specified (content hash = sha256(doc + '|' + PROMPT_VERSION); skip rules; Promise.all of insights + embedding; Prisma transaction with upsert + raw embedding update; stale-resume guard using textHash; final-failure handler setting status FAILED with a truncated error; SIGTERM/SIGINT like the email worker). Export `null` when AI is inactive. Log lines prefixed `[AI Worker]`; never log prompts/resume text.
4. Wire it: in backend/server.js require './src/queues/ai.worker' after the email worker and log `AI worker started` or `AI features disabled (no OPENAI_API_KEY)`.
5. Hook job writes (AI spec §16): in backend/src/modules/jobs/job.service.js import { enqueueJobProcessing } from '../../queues/ai.queue' and call `await enqueueJobProcessing(job.id)` at the end of createJob (before returning) and updateJob (after the update, before returning). No other change in that file.
6. Create backend/scripts/ai-backfill.js per AI spec §18.2 (--force, --limit N; only active jobs; also resumes not READY; prints counts; closes queue, Redis and Prisma; exits cleanly; prints a message and exits 0 when AI is inactive).
7. Add unit tests only for pure logic you add (e.g. a helper that decides "skip or process" if you extract one). Keep `npm test` green.

Verify (needs OPENAI_API_KEY; otherwise list as manual checks):
- Start the server (`npm run dev`). Log in as demo employer (employer1@demo.com / Password123!) and `POST /api/jobs` a new job. Within ~15 s: `SELECT status, summary IS NOT NULL, embedding IS NOT NULL FROM "JobInsight" WHERE "jobId" = '<id>';` shows READY / true / true.
- `PATCH` the same job with a changed description: the row's contentHash changes and the summary is regenerated; `PATCH` with identical content causes NO LLM call (worker log says skipped).
- Soft-delete a job; confirm nothing crashes.
- Run `npm run ai:backfill` and watch the queue drain; run it again and confirm it enqueues ~0 jobs.
- With the key removed from .env: server boots, POST /api/jobs still works, no worker starts, no errors.
````

**Done when:**
- New/updated jobs become `READY` with a summary and an embedding; unchanged updates are skipped.
- Backfill processes existing jobs; a second run finds nothing to do.
- With no key the app behaves exactly as before.

---

## Phase AI-5 — Guards, validation, AI module (status, insights, regenerate, similar jobs)

**Goal:** the HTTP foundation (`/api/ai`) plus F1 read endpoints and F3.

**Prompt:**
````
You are implementing Phase AI-5 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-4 are complete.

1. Create backend/src/middlewares/validateRequest.js exactly as in AI spec §10.3 (stores parsed data on req.validated[target]; never assigns req.query).
2. Create backend/src/middlewares/aiGuard.js (AI spec §10.1/§10.2): requireAiEnabled, aiRateLimit({ name, limit, windowSeconds = 60 }) (Redis multi INCR+EXPIRE, identity = req.user?.userId ?? req.ip, sets Retry-After, 429 ApiError, fails open on Redis errors), aiDailyBudget (key ai:daily:<YYYYMMDD UTC>, cap aiConfig.dailyRequestCap, 503 ApiError, fails open on Redis errors).
3. Extend backend/src/ai/repository.js with getJobEmbeddingText(jobId) and findSimilarJobs({ vecText, excludeJobId, limit }) exactly per §8.8 (same selected columns as the other list queries; ACTIVE condition; `::vector` casts; `1 - (ji."embedding" <=> $v::vector) AS "score"`; ORDER BY the distance expression).
4. Create the module backend/src/modules/ai/: ai.routes.js, ai.controller.js, ai.service.js, ai.schema.js, ai.mapper.js.
   - ai.mapper.js: mapJobRow(row) -> JobCard DTO (§11.1): nested `employer: { id, name, avatarUrl }`, `score` rounded to 4 decimals, dates stay Date objects.
   - ai.schema.js: Zod schemas for the query/body of each route (this phase: similar `limit` 1-10 default 5, using z.coerce).
   - Implement endpoints #1 (GET /status), #2 (GET /jobs/:id/insights), #3 (POST /jobs/:id/insights/regenerate), #5 (GET /jobs/:id/similar) from AI spec §11.2/§11.3 with the exact response shapes, status mapping (NONE/PENDING/READY/FAILED), ownership check (403) and 404s for missing/soft-deleted jobs. Controllers use asyncHandler + ApiResponse; read validated query from req.validated.query.
   - Middleware order per route: requireAiEnabled -> (verifyAccessToken -> requireRole) -> aiRateLimit -> (aiDailyBudget) -> validateRequest -> controller. `/status` has NO requireAiEnabled. Rate-limit names/limits from §11.2.
5. Mount in backend/src/app.js: `app.use('/api/ai', require('./modules/ai/ai.routes'));` after the existing mounts and before the 404 handler. No other change.
6. Add unit tests for mapJobRow.

Verify with curl (AI active; use a job that is READY from phase AI-4):
- GET /api/ai/status -> {enabled:true}.
- GET /api/ai/jobs/<id>/insights -> READY with summary/highlights; for a job with no row -> status NONE; unknown id -> 404.
- GET /api/ai/jobs/<id>/similar?limit=3 -> ready:true and up to 3 JobCards (not including <id>, no deleted/expired jobs, `score` present).
- POST /api/ai/jobs/<id>/insights/regenerate as the owner -> 200 PENDING, as another employer -> 403, as applicant -> 403, unauthenticated -> 401.
- Hit /api/ai/status 70 times quickly -> the 61st+ get 429 with Retry-After.
- With the key removed: /api/ai/status -> {enabled:false}; /api/ai/jobs/<id>/insights -> 503 "AI features are not enabled".
````

**Done when:**
- All four endpoints behave as listed above, including 429, 403, 404 and 503 cases.
- Existing routes unaffected; `npm test` green.

---

## Phase AI-6 — Semantic / natural-language search (F2)

**Goal:** `GET /api/ai/search` — parse the query into filters + semantic phrase, embed, rank with pgvector.

**Prompt:**
````
You are implementing Phase AI-6 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-5 are complete.

1. Extend backend/src/ai/repository.js with searchJobs({ vec, filters, minScore, page, limit }) -> { rows, total } exactly per AI spec §8.8:
   - build a `conds` array of Prisma.sql fragments joined with Prisma.join(conds, ' AND ');
   - always: the ACTIVE condition and `(1 - (ji."embedding" <=> ${lit}::vector)) >= ${minScore}`;
   - locationType => `j."locationType" = ${v}::"LocationType"`; jobType => `j."jobType" = ${v}::"JobType"`;
   - location => `j."location" ILIKE ${'%' + escapeLike(location) + '%'}`;
   - salaryMin => `j."salaryMax" >= x`; salaryMax => `j."salaryMin" <= x` (same semantics as the existing getJobs);
   - ORDER BY ji."embedding" <=> lit::vector ASC LIMIT/OFFSET; total via a second query `SELECT COUNT(*)::int AS "total"` (the ::int cast is mandatory - raw COUNT returns BigInt which JSON cannot serialize).
2. In ai.schema.js add the search query schema (q: trimmed string 2-300 chars required; page: z.coerce int >= 1 default 1; limit: z.coerce int 1-20 default 10).
3. In ai.service.js add searchJobs({ q, page, limit }) per AI spec §12.2: parseSearchQuery -> embedQuery(semanticQuery) -> repository.searchJobs with aiConfig.searchMinScore -> map rows with mapJobRow -> return { query, interpreted: { semanticQuery, filters }, jobs, total, page, totalPages }. Create one `signal = AbortSignal.timeout(SYNC_REQUEST_TIMEOUT_MS)` per request and pass it to parseSearchQuery. Wrap the LLM/embedding part in runAi(...) so provider errors become 502/503/504 ApiErrors.
4. Add endpoint #4 `GET /api/ai/search` (public) with middleware order requireAiEnabled -> aiRateLimit({ name: 'search', limit: 20 }) -> aiDailyBudget -> validateRequest(searchQuerySchema, 'query') -> controller (read req.validated.query).

Verify with curl (needs a key and backfilled jobs; otherwise list as manual):
- /api/ai/search?q=remote%20react%20developer%2010%2B%20LPA -> interpreted.filters.locationType = "REMOTE", salaryMin = 1000000; every returned job has locationType REMOTE and salaryMax >= 1000000.
- /api/ai/search?q=backend%20internship%20in%20Bengaluru -> jobType INTERNSHIP, location "Bengaluru".
- /api/ai/search?q=a -> 400 (too short). /api/ai/search?q=...&page=2&limit=5 -> pagination fields correct, `total` is a number.
- Repeat the same query: second call is fast (parse + embedding cache hits; check Redis keys `ai:parse:*` and `ai:emb:*`).
- Soft-deleted and expired-deadline jobs never appear.
- 21 requests in a minute from one IP -> 429.
- Look at the returned `score` values for a few queries and report them (the developer may tune AI_SEARCH_MIN_SCORE).
````

**Done when:**
- Filters are extracted and applied correctly; results are ranked; pagination works; caching works; error/limit cases behave as above.

---

## Phase AI-7 — Resume module + "use saved resume" in apply (F4 foundation)

**Goal:** applicants can store one resume (text extracted, async profile + embedding); applying can reuse it.

**Prompt:**
````
You are implementing Phase AI-7 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-6 are complete.

1. Create backend/src/modules/resumes/ (resume.routes.js, resume.controller.js, resume.service.js, resume.schema.js) implementing endpoints #10-#13 of AI spec §11 and the upload flow of §12.4.1:
   - Routes mounted at /api/resumes; every route: requireAiEnabled -> verifyAccessToken -> requireRole('APPLICANT') -> aiRateLimit (names/limits from §11.2).
   - multer: memory storage, 5MB limit, PDF only (same limits as application.routes.js). Wrap `upload.single('resume')` in a small middleware that converts MulterError / file-filter errors into ApiError(400) with the messages in §12.4.1 (LIMIT_FILE_SIZE => 'Resume must be 5MB or smaller'; wrong type => 'Only PDF files are allowed').
   - service.upsertResume(userId, file): follow steps 1-8 of §12.4.1 exactly (file required; `%PDF-` magic-number check; extractPdfText; textHash; same-hash+READY shortcut returns the existing DTO BEFORE any upload; uploadToCloudinary(buffer, 'job-board/resumes') from utils; prisma.resume.upsert with `profile: Prisma.DbNull` on update; clearResumeEmbedding; enqueueResumeProcessing; return toResumeDTO(row) with wordCount, NEVER text/textHash/embedding/error).
   - GET /me -> ResumeDTO or null; DELETE /me -> delete row (404 'No resume found' if none; never delete the Cloudinary file); POST /me/reprocess -> set status PENDING + error null, enqueue, return ResumeDTO (404 if none).
   - Create modules/resumes/resume.mapper.js exporting `toResumeDTO(row)` (it must not require prisma/redis, so it can be unit-tested) and unit-test it in backend/test/ai/ (no text/textHash/embedding/error leaks; wordCount computed from text; profile passed through).
2. Mount in backend/src/app.js: `app.use('/api/resumes', require('./modules/resumes/resume.routes'));` (next to the /api/ai mount).
3. Apply-flow integration (AI spec §16, exact rules):
   - application.controller.js handleApplyToJob: `const resumeBuffer = req.file ? req.file.buffer : undefined; const useSavedResume = req.body?.useSavedResume === 'true';` and call `applyToJob(applicantId, jobId, resumeBuffer, coverLetter, { useSavedResume })`.
   - application.service.js applyToJob: add the 5th parameter `{ useSavedResume = false } = {}`. Keep the existing order of checks (job exists, deadline, duplicate). Then resolve resumeUrl: buffer => uploadToCloudinary as today; else useSavedResume => prisma.resume.findUnique({ where: { userId: applicantId } }) (none => ApiError(400, 'No saved resume found. Please upload a resume.')) and use its fileUrl; else ApiError(400, 'Resume is required'). A provided file always wins. Leave the rest of the function (create application, email enqueue, notification) untouched.

Verify with curl (AI active; the demo applicant is applicant1@demo.com / Password123!). Prepare 3 PDFs: a normal text resume, a PDF with no text (e.g. an image-only/blank PDF), and a non-PDF file renamed to .pdf:
- PUT /api/resumes/me with the good PDF -> 200 status PENDING, wordCount > 0; within ~15 s GET /api/resumes/me shows READY with a profile (skills, headline...). In psql the row has text, and `embedding IS NOT NULL`.
- Same PDF again -> returns immediately READY with no Cloudinary upload and no new worker job. A different PDF -> PENDING again and `embedding` is NULL until reprocessed.
- Blank PDF -> 422 'This PDF has no readable text...'. Fake PDF -> 400 'Only PDF files are allowed'. >5MB -> 400. Wrong field name -> 400 'Resume file is required'. Employer token -> 403.
- DELETE -> 200; GET -> null; deleting again -> 404.
- Apply flow: (a) apply with an uploaded file as before -> works exactly as before (email/notification still created). (b) apply with `useSavedResume=true` and no file -> application.resumeUrl equals the saved fileUrl. (c) apply with neither -> 400 'Resume is required' (previously a 500). (d) useSavedResume=true with no saved resume -> 400. (e) duplicate application still -> 409.
- With the key removed: /api/resumes/me -> 503; applying with an uploaded file still works.
````

**Done when:**
- All upload/processing/delete cases behave as listed; the stale-processing guard keeps the newest resume.
- Apply works with an upload (unchanged), with a saved resume, and returns clean 400s otherwise.

---

## Phase AI-8 — Recommendations and fit analysis (F4)

**Goal:** `GET /api/ai/recommendations` and `POST /api/ai/jobs/:id/fit`.

**Prompt:**
````
You are implementing Phase AI-8 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-7 are complete.

1. Extend backend/src/ai/repository.js with getResumeEmbeddingText(userId) and findRecommendations({ vecText, userId, page, limit }) -> { rows, total } per §8.8 (ACTIVE condition plus `NOT EXISTS (SELECT 1 FROM "Application" a WHERE a."jobId" = j."id" AND a."applicantId" = ${userId})`, ordered by cosine distance, total via COUNT(*)::int).
2. ai.schema.js: recommendations query (page z.coerce >= 1 default 1; limit z.coerce 1-20 default 10).
3. ai.service.js:
   - getRecommendations(userId, { page, limit }) per §11.3 #6 and §12.4.3: no resume => { resumeStatus: 'NONE', ready: false, jobs: [], total: 0, page, totalPages: 0 }; resume not READY (or embedding missing) => same with resumeStatus = its status and ready false; READY => ranked JobCards, applied jobs excluded.
   - analyzeFitForUser(userId, jobId) per §11.3 #7 / §12.4.4: 404 for missing/deleted job (load with employer name); no Resume row => ApiError(409, 'Upload your resume to use this feature', [{ code: 'RESUME_REQUIRED' }]); otherwise getFitAnalysis({ job, employerName, resume: { text, textHash }, signal: AbortSignal.timeout(SYNC_REQUEST_TIMEOUT_MS) }) inside runAi => { analysis, cached }. It must work as soon as the resume text is stored (do not require READY).
4. Routes: GET /recommendations (APPLICANT; aiRateLimit 'recommendations' 30/min; validateRequest query) and POST /jobs/:id/fit (APPLICANT; aiRateLimit 'fit' 10/min; aiDailyBudget). Middleware order as in §10.1.
5. Unit-test any new pure helper (e.g. totalPages calculation).

Verify with curl (needs a key; otherwise list as manual):
- Applicant with no resume: GET /recommendations -> 200 resumeStatus NONE; POST /jobs/<id>/fit -> 409 with errors[0].code 'RESUME_REQUIRED'.
- After uploading a resume that is READY: GET /recommendations returns ranked jobs, none already applied (apply to one, call again, it disappears); pagination fields correct.
- POST /jobs/<id>/fit -> analysis with score 0-100 (integer), verdict consistent with the score bands (>=75 STRONG_FIT, 55-74 GOOD_FIT, 35-54 PARTIAL_FIT, else WEAK_FIT), arrays within limits; `cached:false` first call, `cached:true` second call (and no new LLM call).
- Use two very different resumes (e.g. a backend developer vs a graphic designer) against a "Backend Developer" job: scores must differ clearly and sensibly.
- Employer token -> 403. 11 fit calls in a minute -> 429.
````

**Done when:**
- Recommendations are ranked, exclude applied jobs and handle every resume state; fit analysis is consistent, cached and error-safe.

---

## Phase AI-9 — LangGraph application assistant: cover letter + resume tips (F5)

**Goal:** the graph, its chain functions, and endpoints #8 and #9.

**Prompt:**
````
You are implementing Phase AI-9 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-8 are complete.

1. Chains (AI spec §12.5, §13, §14.5-§14.8), each lazy, each accepting { signal }:
   - chains/resumeTips.chain.js: generateResumeTips({ document, resumeText, analysis, signal }) (structured, ResumeTipsSchema, normalizeTips) and getResumeTips({ job, employerName, resume, analysis, signal }) -> { tips (the DTO: summary, tips, keywordsToConsider), cached } with cache key `ai:tips:<PROMPT_VERSION>:<resume.textHash>:<jobDocHash>` (TTL TIPS).
   - chains/coverLetter.chain.js: writeCoverLetter(...) and reviseCoverLetter(...) using getWritingModel() + StringOutputParser (plain text, cleaned with cleanText), and critiqueCoverLetter(...) using the structured chat model + CritiqueSchema. critique returns { passed, unsupportedClaims, issues } where the code-level checks of §13 `reviewDraft` are appended to issues (placeholder regex /\[[^\]\n]{1,60}\]/, markdown regex /^\s*([#>*-]|\d+\.)\s|\*\*/m, word count outside [min*0.9, max*1.1] using the tone map, missing greeting /^\s*dear\b/i) and `passed` is recomputed in code.
2. Graph: backend/src/ai/graphs/applicationAssistant.graph.js implementing §13 exactly: Annotation.Root state with the listed keys (revisions has reducer (_a, b) => b and default 0), nodes analyzeMatch / writeDraft / reviewDraft / reviseDraft / suggestTips, the conditional edges (always pass the explicit destination arrays), MAX_REVISIONS from constants. NODE NAMES MUST NOT EQUAL STATE KEYS (LangGraph throws) - use exactly the names in §13. Every node takes (state, config) and passes config?.signal to the chain calls. Compile once (lazy module-level singleton). Export runApplicationAssistant(input) which invokes with { signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS), recursionLimit: GRAPH_RECURSION_LIMIT } and returns the mode-specific result from §13 (cover letter => { coverLetter, revisions, warnings }; tips => { summary, tips, keywordsToConsider, cached }).
3. ai.schema.js: cover-letter body schema (tone enum default 'PROFESSIONAL'; notes optional trimmed string max COVER_LETTER_NOTES_MAX_CHARS, empty string => undefined).
4. ai.service.js: generateCoverLetterForUser(userId, jobId, { tone, notes }) and generateResumeTipsForUser(userId, jobId) per §12.5 (load job + employer name -> 404; load Resume (text, textHash) and User.name -> 409 RESUME_REQUIRED; run the graph inside runAi). Return the DTOs of §11.3 #8/#9 (cover letter response includes tone).
5. Routes #8 POST /jobs/:id/cover-letter (aiRateLimit 'cover-letter' 5/min, aiDailyBudget, validateRequest body) and #9 POST /jobs/:id/resume-tips (aiRateLimit 'resume-tips' 5/min, aiDailyBudget). APPLICANT only.
6. Replace the `--full` stub in scripts/ai-smoke.js with real graph checks (§18.1 item 6).
7. Unit-test pure helpers: the code-level critique checks (placeholder, markdown, word-count bounds, greeting) and the warnings composition.

Verify (needs a key; otherwise list as manual):
- `npm run ai:smoke -- --full` passes.
- POST cover-letter for 3 different jobs with one resume: letters are plain text, start with "Dear Hiring Team,", end with "Sincerely," + the applicant's name, mention only facts from the resume, 220-320 words (CONCISE: 150-200), no [placeholders]. `notes: "I recently completed an AWS Cloud Practitioner certification"` makes the letter mention it.
- Test the fact-check loop: temporarily force a bad draft in a test (e.g. unit-test reviewDraft with a draft that claims "10 years at Google") and confirm critique.unsupportedClaims is non-empty and the route returns `revisions: 1` and, if still failing, warnings.
- resume-tips returns 4-8 tips with valid enums and keywordsToConsider <= 10; second call `cached:true`.
- Aborting: set AI_REQUEST_TIMEOUT_MS=1 temporarily -> endpoint returns 504 with the friendly message (never raw provider text).
- Employer token -> 403; no resume -> 409 RESUME_REQUIRED; unknown job -> 404; 6th cover letter in a minute -> 429.
````

**Done when:**
- Both endpoints work, letters are grounded and well-formed, the revise loop is bounded, errors map to 502/503/504, smoke `--full` passes.

---

## Phase AI-10 — Frontend foundation (API, hooks, shared components)

**Goal:** everything later UI phases import, with no visible UI change yet.

**Prompt:**
````
You are implementing Phase AI-10 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. The backend (AI-0..AI-9) is complete. This is the first frontend phase. Stack: React 19, Vite, Tailwind 3, TanStack Query v5, react-router-dom, axios (src/api/axios.js), zustand, react-hot-toast, lucide-react. No new npm packages.

1. src/api/ai.js and src/api/resumes.js with every function in AI spec §15.2 (same style as src/api/jobs.js; return response.data.data; give generateCoverLetter and getResumeTips a { timeout: 120000 } axios option).
2. src/hooks/useAi.js and src/hooks/useResume.js with every hook in AI spec §15.3, including query keys, polling rules, `keepPreviousData` (import it from '@tanstack/react-query') for search, and `enabled` gating (`!!accessToken` from useAuthStore for login-only queries). useAiStatus: staleTime Infinity, retry false.
3. Shared components in src/components/ai/:
   - AiBadge.jsx: small pill with the lucide Sparkles icon and text "AI".
   - JobCard.jsx (props { job, rank }): per AI spec §15.8 - Link to /jobs/:id, mirrors the card look in pages/jobs/Jobs.jsx (title, employer name, location/locationType/jobType badges, ₹ salary, posted date, optional deadline), optional rank badge, does NOT show `score`. Use a local formatBadgeText helper (do not import from other pages).
   - ResumeRequiredNotice.jsx: info box "Upload your resume to get an AI fit check, resume tips and cover letters." with a Link to /profile (accepts optional `compact` prop).
4. Do not change any existing file in this phase.

Verify: `npm run build` and `npm run lint` in frontend/ succeed with no new errors; the app still runs and looks identical.
````

**Done when:**
- Build and lint are clean; no existing page changed.

---

## Phase AI-11 — Job detail: AI summary + similar jobs (F1, F3 UI)

**Prompt:**
````
You are implementing Phase AI-11 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-10 are complete.

1. Create src/components/ai/JobAiSummary.jsx ({ jobId, isOwner }) per AI spec §15.5 item 1: uses useAiStatus (render nothing if not enabled) and useJobInsights(jobId); states READY / PENDING (spinner + polling, shows previous summary with an "updating…" note if present) / NONE (owner-only "Generate AI summary" button -> useRegenerateInsights) / FAILED (owner-only retry). READY layout: Sparkles header "AI summary", summary paragraph, experience-level badge (hidden for UNSPECIFIED), bullet lists for responsibilities and requirements, chips for nice-to-have and perks (render only non-empty groups), footnote "AI-generated — may contain mistakes. See the full description below."
2. Create src/components/ai/SimilarJobs.jsx ({ jobId }): heading "Similar jobs", up to 5 JobCards via useSimilarJobs, renders nothing when AI is disabled, not ready, loading error, or empty.
3. Edit pages/jobs/JobDetail.jsx - ADDITIONS ONLY:
   - import the two components; compute `isOwner = user?.role === 'EMPLOYER' && user?.id === job.employer?.id` right after the existing `const job = data;` line (it is a plain constant, not a hook);
   - render <JobAiSummary jobId={id} isOwner={isOwner} /> inside the white card directly above the "Description" section (wrap in a `mb-8` div);
   - render <SimilarJobs jobId={id} /> after the white card's closing tag (still inside the max-w-4xl container, with `mt-8`).
   Existing markup, hooks, apply modal and behaviour remain untouched.

Verify manually (backend running, jobs backfilled):
- Open a READY job as a guest: summary card and similar jobs appear. Open a job for which the backend returns NONE (e.g. insert one via seed without backfill): no card for guests; as the owning employer a "Generate AI summary" button appears and works (card shows the generating state, then the summary).
- Create a new job as employer: after redirect, the detail page shows "Generating…" then the summary appears without a manual refresh.
- Stop the backend key (AI disabled): the page looks exactly like before. `npm run build` and `npm run lint` are clean.
````

**Done when:**
- Summary and similar jobs render in all states; with AI disabled the page is unchanged.

---

## Phase AI-12 — Jobs page: AI search tab (F2 UI)

**Prompt:**
````
You are implementing Phase AI-12 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-11 are complete.

1. Move the current contents of src/pages/jobs/Jobs.jsx VERBATIM into src/pages/jobs/KeywordJobs.jsx, changing only the component name/default export to `KeywordJobs`. (Behaviour must stay identical: its URL-param handling, skeleton and pagination.)
2. Rewrite src/pages/jobs/Jobs.jsx as the thin wrapper of AI spec §15.4 item 2 (tabs "Keyword search" | "✨ AI search"; AI tab and AI mode only when useAiStatus().data?.enabled; switching uses setSearchParams({ mode: 'ai' }) / setSearchParams({}); conditional render of <AiJobSearch /> or <KeywordJobs />; wrapper className "bg-gray-50"; tab bar container "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6"). main.jsx keeps importing './pages/jobs/Jobs' - do not change main.jsx.
3. Create src/components/ai/AiJobSearch.jsx per AI spec §15.4 item 3: URL params `aq` and `page`; input (maxLength 300) + Search button (disabled < 2 chars / loading); four example chips; "Understood as:" chips built from `interpreted` (only non-null filters; format salary with toLocaleString('en-IN')); JobCard list; pagination; empty state; skeleton loading; error state with the server message and a "Search by keywords instead" button that calls setSearchParams({ q: aq }); footnote.

Verify manually:
- Keyword tab behaves exactly as before (filters, URL params, pagination, clear).
- AI tab: try the four example chips and 3 queries of your own; "Understood as" chips match the query; results are relevant; pagination works; the URL (?mode=ai&aq=...&page=2) is shareable - reloading shows the same results.
- Break the backend key / stop OpenAI access: the error box appears and "Search by keywords instead" switches to the keyword tab with `q` prefilled and results shown.
- With AI disabled: no tabs are visible; the page is identical to the original.
- `npm run build` and `npm run lint` clean.
````

**Done when:**
- Both tabs work; fallback works; disabled-AI state is unchanged.

---

## Phase AI-13 — Resume card, Recommended page, saved resume in the apply modal (F4 UI)

**Prompt:**
````
You are implementing Phase AI-13 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-12 are complete.

1. src/components/ai/ResumeCard.jsx per AI spec §15.6 (states: no resume / PENDING with spinner + polling / READY with file name + "View PDF" link + word count + updated date + headline + "~X years" + top 12 skills chips + Replace + Delete(confirm) / FAILED with Try again + Replace; privacy notice; client-side 5MB and PDF-type checks with toasts; server messages shown via toast).
2. Edit src/pages/shared/Profile.jsx - ONE ADDITION: after the closing tag of the existing white card (inside the `max-w-2xl mx-auto` container) render `{user?.role === 'APPLICANT' && aiEnabled && <ResumeCard />}` (get `aiEnabled` from useAiStatus). Nothing else changes.
3. src/pages/applicant/Recommended.jsx per AI spec §15.7 (all states: AI disabled, NONE, PENDING, FAILED, READY with ranked JobCards (rank badge), pagination, empty state).
4. Edit src/main.jsx: add the route `/recommended` wrapped in `<RoleRoute allowedRole="APPLICANT">` (same pattern as /my-applications) and the import.
5. Edit src/components/Navbar.jsx: add an APPLICANT-only "Recommended" link (same classes as "My Applications", placed before it) rendered only when AI is enabled.
6. Edit src/pages/jobs/JobDetail.jsx apply modal (ADDITIONS ONLY; follow AI spec §15.5 intro + item 4 exactly). Important structure facts: the component calls its hooks at the top, then `const isApplicant` / `const isDeadlinePassed`, then EARLY RETURNS (loading/error), then `const job = data;`. Therefore:
   - add the new hooks (`useQueryClient`, `useAiStatus`, `useMyResume({ enabled: aiEnabled && isApplicant })`, `const [useSaved, setUseSaved] = useState(true)`) directly after the `isApplicant`/`isDeadlinePassed` constants and BEFORE the first `if (isLoading)` early return; derive `usingSaved = aiEnabled && isApplicant && !!savedResume && useSaved`;
   - in `handleApply` replace `if (!formData.resume)` with `if (!usingSaved && !formData.resume)` (same toast); append `useSavedResume = 'true'` (and no file) when `usingSaved`, otherwise append `resume` as today; in `onSuccess` keep the existing lines and add `queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] })` and `setUseSaved(true)`;
   - in the modal JSX: when `aiEnabled && isApplicant && savedResume` show the two radio options ("Use my saved resume (<fileName>)" default / "Upload a different PDF"); render the file-input block only when `!usingSaved` and set `required={!usingSaved}` on it; add `max-h-[90vh] overflow-y-auto` to the modal's inner container class.
   If there is no saved resume or AI is disabled the modal must look and behave exactly as before. Leave the CoverLetterAssistant for the next phase.

Verify manually (applicant1@demo.com):
- Profile: upload a PDF -> "Analyzing…" then READY with detected skills; replace it; delete it; upload a blank PDF and a >5MB file -> proper toasts; employer accounts do not see the card.
- /recommended: NONE state before upload; ranked list after; apply to the top job -> it disappears from the list on return.
- Apply modal: with a saved resume the default option applies without choosing a file; choosing "Upload a different PDF" requires a file; the created application's resume link works. Without a saved resume the modal is unchanged.
- `npm run build` and `npm run lint` clean.
````

**Done when:**
- Resume management, recommendations and saved-resume applying all work; disabled/no-resume states are unchanged or clean.

---

## Phase AI-14 — Fit analysis, resume tips, cover-letter assistant (F4b + F5 UI)

**Prompt:**
````
You are implementing Phase AI-14 of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-13 are complete.

1. src/components/ai/FitAnalysisCard.jsx ({ jobId }) per AI spec §15.5: "Check my fit" button; loading text; result with SVG score ring, verdict pill (STRONG_FIT green "Strong fit", GOOD_FIT blue "Good fit", PARTIAL_FIT amber "Partial fit", WEAK_FIT red "Weak fit"), summary, matched skills (green chips), missing skills (gray/red chips), strengths and gaps lists, recommendation, footnote. Use useAnalyzeFit; toast errors; RESUME_REQUIRED (errors[0].code) shows <ResumeRequiredNotice compact />.
2. src/components/ai/ResumeTipsCard.jsx ({ jobId }): "Get resume tips for this job" button; result with summary, tips sorted HIGH -> MEDIUM -> LOW (priority pill + section label + suggestion + muted reason), "Keywords to consider" chips with the caution "Only add what you genuinely have experience with."; collapsible after loading. Use useResumeTips.
3. src/components/ai/CoverLetterAssistant.jsx ({ jobId, hasResume, existingText, onGenerated }) per AI spec §15.5: tone select, optional notes input (maxLength 500), "✨ Write with AI" / "Regenerate" button, loading text "Writing… this can take up to a minute", amber warnings box when `warnings.length`, disclaimer "Review and edit before submitting — AI can make mistakes.", disabled + notice when !hasResume, handles RESUME_REQUIRED. If `existingText` is non-empty, confirm with window.confirm before calling onGenerated.
4. Edit src/pages/jobs/JobDetail.jsx (ADDITIONS ONLY; hooks you need such as useMyResume/useAiStatus already exist from phase AI-13 - reuse `aiEnabled` and `savedResume`):
   - after the "Required Skills" block and before the existing `{!hideApplySection && (` block (inside the white card), when `isApplicant && !hideApplySection && !isDeadlinePassed && aiEnabled`, render an "AI tools for this job" block: if `savedResume === null` render <ResumeRequiredNotice />, otherwise <FitAnalysisCard key={id} jobId={id} /> and <ResumeTipsCard key={id} jobId={id} />;
   - in the apply modal, directly above the cover-letter textarea's wrapper `div`, when `aiEnabled && isApplicant`, render <CoverLetterAssistant jobId={id} hasResume={!!savedResume} existingText={formData.coverLetter} onGenerated={(text) => setFormData((f) => ({ ...f, coverLetter: text }))} />.
   The modal must still work exactly as before if the assistant is never used.

Verify manually (applicant with a READY resume):
- Check my fit on three different jobs: ring/verdict/lists render; second click is instant (cached).
- Resume tips render, sorted by priority.
- Cover letter: generate in each tone, add a note, regenerate, edit the text, then submit the application - the saved coverLetter equals the edited text. If warnings appear they are shown.
- Applicant without a resume: notices appear instead; employer and guest users see none of these blocks.
- Hit a rate limit (6 cover letters/min) -> friendly toast. `npm run build` and `npm run lint` clean.
````

**Done when:**
- All three AI blocks work end-to-end and degrade gracefully; the apply flow is unchanged when unused.

---

## Phase AI-15 — Hardening, docs and final verification

**Prompt:**
````
You are implementing Phase AI-15 (final) of the Anvil AI features. Specs: ANVIL_spec.md and ANVIL_AI_spec.md. Phases AI-0..AI-14 are complete.

1. README.md: add an "AI features" section (keep the existing README intact): feature list (F1-F5), architecture diagram (adapt AI spec §5), the new env vars table (§6), setup steps (pgvector image, migrate, key, backfill, smoke test), the cost-control notes (§17), the Nginx timeout/TRUST_PROXY notes (§19), privacy note (resume text goes to OpenAI; keep LangSmith tracing off), and the scripts (`npm run ai:smoke`, `npm run ai:backfill`, `npm test`). Update the tech-stack table with LangChain, LangGraph, OpenAI, pgvector.
2. Review pass (fix only AI-related code you wrote):
   - grep for `temperature`, `reasoningEffort`, `console.log(` of prompts/resume text, hard-coded model names outside config defaults, `req.query =`, and `COUNT(*)` without `::int` in backend/src/ai and backend/src/modules/{ai,resumes}; fix any hit.
   - confirm no module constructs OpenAI clients at require-time (start the server with no key and with AI_ENABLED=false).
   - confirm every AI route follows the middleware order of AI spec §10.1 and the limits of §11.2.
   - confirm the frontend makes NO AI request for guests except /api/ai/status, insights, similar and search (check the Network tab / axios calls while logged out).
3. Run the complete verification checklist below and report each line as PASS / FAIL / MANUAL (with reason).
4. Do NOT fix the pre-existing issues of AI spec §20; list them in the final report as "observed, not fixed".
````

**Done when:** every line of the checklist below is PASS (or MANUAL with a reason the developer can act on).

### Final verification checklist

| # | Check | Expected |
|---|---|---|
| 1 | `cd backend && npm test` | all green |
| 2 | Start backend with **no** `OPENAI_API_KEY` | boots; `GET /api/ai/status` → `{enabled:false}`; `/api/ai/search?q=react` → 503; existing endpoints (login, jobs, apply with upload, notifications, dashboard) work |
| 3 | Start with key, `npm run ai:smoke -- --full` | all PASS |
| 4 | `npm run ai:backfill` then again | first enqueues all active jobs; second enqueues ~0; all `JobInsight` rows `READY` with embeddings |
| 5 | Create/edit/soft-delete a job as employer | insight created/refreshed; unchanged edit makes no LLM call; deleted jobs never appear in AI results |
| 6 | AI search: 5 varied queries (incl. salary, location, job type, remote) | filters interpreted correctly; relevant ordering; pagination; fallback button works when OpenAI is unreachable |
| 7 | Similar jobs on 3 job pages | ≤ 5 relevant jobs, never the same job |
| 8 | Resume: upload / replace / delete / blank PDF / fake PDF / >5 MB | correct statuses and messages; `GET /api/resumes/me` never exposes text/error/embedding |
| 9 | Recommendations | ranked, exclude applied jobs, correct for NONE/PENDING/FAILED/READY |
| 10 | Fit analysis on 5 jobs | score/verdict consistent with bands; cached on repeat; sensible differences between jobs |
| 11 | Cover letters (3 tones, with/without notes) | plain text, grounded in resume, correct length, signed; warnings shown when unverifiable; editing preserved on submit |
| 12 | Resume tips | 4–8 truthful tips, keywords ≤ 10, no invented skills |
| 13 | Rate limits & daily cap | 429 with `Retry-After`; set `AI_DAILY_REQUEST_CAP=3`, 4th LLM call → 503 |
| 14 | Authorization | employer token on applicant AI/resume routes → 403; guests on protected routes → 401; non-owner regenerate → 403 |
| 15 | Frontend, AI disabled | no AI tabs/cards/links anywhere; pages identical to before |
| 16 | Frontend, logged out | no AI requests except status/insights/similar/search |
| 17 | `npm run build` + `npm run lint` (frontend) | clean |
| 18 | Existing regression pass: register/login/refresh, employer CRUD, keyword search/filters, apply (upload), withdraw, status change emails + notifications, dashboard | unchanged behaviour |

---

## Summary

| Phase | What gets built |
|---|---|
| AI-0 | pgvector Postgres image, Node ≥ 22.3, AI packages, env template, `trust proxy` |
| AI-1 | Prisma `JobInsight` + `Resume`, vector columns, HNSW index (migration) |
| AI-2 | `src/ai` core: config, constants, errors, cache, LLM/embedding factories, text/vector/PDF utils, schemas, normalizers + unit tests |
| AI-3 | Prompts + 4 chains (job insights, search parsing, resume profile, fit analysis) + live smoke script |
| AI-4 | BullMQ `ai` queue + worker, job create/update hooks, repository write helpers, backfill script (F1 pipeline) |
| AI-5 | Guards (enabled, rate limit, daily budget), `validateRequest`, `/api/ai`: status, insights, regenerate, similar jobs (F1, F3) |
| AI-6 | Natural-language semantic search endpoint (F2) |
| AI-7 | Resume module (PDF → text → profile + embedding) and "use saved resume" in apply (F4 foundation) |
| AI-8 | Recommended jobs + fit analysis endpoints (F4) |
| AI-9 | LangGraph application assistant: cover letter (write → fact-check → revise) and resume tips (F5) |
| AI-10 | Frontend foundation: API, hooks, shared components |
| AI-11 | Job detail: AI summary + similar jobs (F1, F3 UI) |
| AI-12 | Jobs page: AI search tab (F2 UI) |
| AI-13 | Resume card, Recommended page, saved resume in apply modal (F4 UI) |
| AI-14 | Fit analysis, resume tips and cover-letter assistant UI (F4b, F5 UI) |
| AI-15 | README, review pass, full verification |
