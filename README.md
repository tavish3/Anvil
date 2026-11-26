# Anvil

A full-stack job board platform where **Employers** can post and manage job listings, and **Applicants** can search, apply, and track their applications. Built with production-ready patterns, Docker support, and a modern tech stack.

---

## Features

### For Employers
- **Job Management**: Create, edit, and soft-delete job listings
- **Application Pipeline**: View applicants for each listing and move them through stages (Applied → Reviewing → Interview → Offered → Rejected)
- **Dashboard**: Overview statistics including total listings, total applications, and breakdown by stage
- **Real-time Notifications**: In-app bell icon with unread count and email notifications for new applications
- **Profile Management**: Update company profile and upload avatar

### For Applicants
- **Job Search**: Browse jobs with advanced filters (location, job type, salary range, keywords)
- **Job Details**: View comprehensive job information including employer details
- **Application Tracking**: Apply to jobs with resume upload and optional cover letter
- **Application Dashboard**: Track all applications with current status and ability to withdraw
- **Real-time Notifications**: In-app bell icon with unread count and email notifications for status changes
- **Profile Management**: Update personal profile and upload avatar

### Technical Features
- **JWT Authentication**: Access + refresh token rotation for secure sessions
- **Password Reset**: Tokenized email-based password recovery
- **File Uploads**: Cloudinary integration for avatars and resumes
- **Email Queue**: BullMQ + Redis for async email notifications with retry logic
- **In-App Notifications**: Real-time notification system with polling
- **Role-Based Access Control**: Separate permissions for employers and applicants
- **Docker Support**: Containerized PostgreSQL and Redis for local development
- **API Validation**: Zod schemas for request validation
- **Responsive UI**: Modern React frontend with Tailwind CSS

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend Runtime** | Node.js ≥ 22.3 |
| **Backend Framework** | Express.js |
| **Database** | PostgreSQL 15 + pgvector |
| **ORM** | Prisma |
| **Cache / Queues** | Redis 7 + BullMQ |
| **AI / LLM** | Google Gemini (chat + embeddings) via LangChain & LangGraph |
| **File Storage** | Cloudinary |
| **Email** | Nodemailer (SMTP) |
| **Authentication** | JWT (access + refresh tokens) |
| **Validation** | Zod |
| **Frontend Framework** | React + Vite |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query v5 |
| **Routing** | React Router v6 |
| **Styling** | Tailwind CSS |
| **Containerization** | Docker + Docker Compose |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │   Hooks     │              │
│  │  (Router)   │  │  (UI Lib)   │  │ (TanStack)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         └────────────────┴────────────────┘                     │
│                          │                                      │
│                    Zustand Store                                │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP (Axios)
┌──────────────────────────┼──────────────────────────────────────┐
│                    Backend (Express)                            │
│                          │                                      │
│  ┌───────────────────────┼───────────────────────┐              │
│  │                       │                       │              │
│  ▼                       ▼                       ▼              │
│ ┌─────────┐          ┌─────────┐          ┌─────────┐           │
│ │  Auth   │          │  Jobs   │          │   Apps  │           │
│ │ Module  │          │ Module  │          │ Module  │           │
│ └────┬────┘          └────┬────┘          └────┬────┘           │
│      │                    │                    │                │
│      └────────────────────┴────────────────────┘                │
│                           │                                     │
│                    ┌──────┴──────┐                              │
│                    │  Middleware │                              │
│                    │ (Auth, RBAC)│                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PostgreSQL   │    │    Redis     │    │  Cloudinary  │
│  (Prisma)    │    │  (BullMQ)    │    │   (Files)    │
└──────────────┘    └──────────────┘    └──────────────┘
                            │
                    ┌───────┴───────┐
                    │ Email Worker  │
                    │  (BullMQ)     │
                    └───────┬───────┘
                            │
                    ┌───────┴───────┐
                    │   Nodemailer  │
                    │    (SMTP)     │
                    └───────────────┘
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)
- Cloudinary account (for file uploads)
- SMTP server (Gmail or Mailtrap for development)

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd Anvil

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Environment Variables

Create `.env` files in both `backend/` and `frontend/`:

**Backend `.env`:**
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobboard

# Redis
REDIS_URL=redis://localhost:6379

# JWT
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key
ACCESS_TOKEN_EXPIRY=30m
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key
REFRESH_TOKEN_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (use Mailtrap for development)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password

# Client
CLIENT_URL=http://localhost:5173
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:5000
```

### Step 3: Database Setup

```bash
cd backend

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# (Optional) Seed database with test data
npx prisma db seed
```

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## Docker Setup

### Using Docker Compose (Recommended)

The project includes a `docker-compose.yml` for easy infrastructure setup.

```bash
# Start PostgreSQL and Redis (for local backend development)
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Docker Services

| Service | Description | Ports |
|---------|-------------|-------|
| postgres | PostgreSQL database | 5432 |
| redis | Redis for caching and queues | 6380 (host) → 6379 (container) |

---

## Environment Variables Reference

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Server port | 5000 |
| `NODE_ENV` | Yes | Environment | development/production |
| `DATABASE_URL` | Yes | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| `REDIS_URL` | Yes | Redis connection string | redis://localhost:6379 |
| `ACCESS_TOKEN_SECRET` | Yes | JWT signing secret for access tokens | random-string |
| `ACCESS_TOKEN_EXPIRY` | No | Access token lifetime (default: 15m) | 15m |
| `REFRESH_TOKEN_SECRET` | Yes | JWT signing secret for refresh tokens | random-string |
| `REFRESH_TOKEN_EXPIRY` | No | Refresh token lifetime (default: 7d) | 7d |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name | my-cloud |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key | 123456789 |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret | abcdefghijklmnop |
| `SMTP_HOST` | Yes | SMTP server host | smtp.gmail.com |
| `SMTP_PORT` | Yes | SMTP server port | 587 |
| `SMTP_USER` | Yes | SMTP username | email@gmail.com |
| `SMTP_PASS` | Yes | SMTP password | app-specific-password |
| `CLIENT_URL` | Yes | Frontend URL for email links | http://localhost:5173 |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API base URL | http://localhost:5000 |

---

## API Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/register` | No | Register new user (name, email, password, role) |
| POST | `/login` | No | Login and receive access token + refresh token cookie |
| POST | `/refresh` | No | Rotate refresh token and get new access token |
| POST | `/logout` | Yes | Logout and clear refresh token |
| POST | `/forgot-password` | No | Request password reset email |
| POST | `/reset-password` | No | Reset password with token |

### Users (`/api/users`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/me` | Yes | Get current user profile |
| PATCH | `/me` | Yes | Update user name |
| PATCH | `/me/avatar` | Yes | Upload avatar image |

### Jobs (`/api/jobs`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/` | No | List jobs with search, filters, and pagination |
| GET | `/:id` | No | Get single job details |
| POST | `/` | Employer | Create new job listing |
| PATCH | `/:id` | Employer | Update job listing |
| DELETE | `/:id` | Employer | Soft-delete job listing |
| GET | `/my/listings` | Employer | Get all own job listings |

**Query Parameters for GET `/`:**
- `q` - Keyword search (title + description)
- `location` - Location filter
- `locationType` - REMOTE | ONSITE | HYBRID
- `jobType` - FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP
- `salaryMin` - Minimum salary
- `salaryMax` - Maximum salary
- `sortBy` - newest | salaryAsc | salaryDesc
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### Applications (`/api/applications`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/jobs/:jobId/apply` | Applicant | Apply to a job with resume |
| DELETE | `/:id/withdraw` | Applicant | Withdraw application |
| GET | `/my` | Applicant | Get all own applications |
| GET | `/jobs/:jobId` | Employer | Get all applicants for a job |
| PATCH | `/:id/status` | Employer | Update application status |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/employer` | Employer | Get employer dashboard stats |

### Notifications (`/api/notifications`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/` | Yes | Get all notifications for user |
| GET | `/unread-count` | Yes | Get unread notification count |
| PATCH | `/:id/read` | Yes | Mark notification as read |
| PATCH | `/read-all` | Yes | Mark all notifications as read |

---

## Frontend Pages

| Route | Access Level | Description |
|-------|--------------|-------------|
| `/register` | Public | User registration with role selection |
| `/login` | Public | User login |
| `/forgot-password` | Public | Request password reset |
| `/reset-password` | Public | Reset password with token |
| `/jobs` | Public | Browse and search jobs |
| `/jobs/:id` | Public | Job details and apply form |
| `/profile` | Authenticated | Edit profile and upload avatar |
| `/my-applications` | Applicant | Track all applications |
| `/my-listings` | Employer | Manage job listings |
| `/my-listings/new` | Employer | Create new listing |
| `/my-listings/:id/edit` | Employer | Edit listing |
| `/my-listings/:id/applicants` | Employer | View and manage applicants |
| `/dashboard` | Employer | Dashboard statistics |

---

## Project Structure

```
Anvil/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── migrations/            # Database migrations
│   │   └── seed.js                # Seed data
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # Prisma client
│   │   │   ├── redis.js           # Redis client
│   │   │   └── cloudinary.js      # Cloudinary config
│   │   ├── middlewares/
│   │   │   ├── auth.js            # JWT verification
│   │   │   ├── requireRole.js     # Role-based access control
│   │   │   └── validate.js        # Request validation
│   │   ├── modules/
│   │   │   ├── auth/              # Authentication module
│   │   │   ├── users/             # User profile module
│   │   │   ├── jobs/              # Jobs module
│   │   │   ├── applications/      # Applications module
│   │   │   ├── dashboard/         # Dashboard module
│   │   │   └── notifications/     # Notifications module
│   │   ├── queues/
│   │   │   ├── email.queue.js     # BullMQ queue
│   │   │   └── email.worker.js    # Email worker
│   │   ├── emails/
│   │   │   ├── mailer.js          # Nodemailer transporter
│   │   │   └── templates/         # Email templates
│   │   ├── utils/
│   │   │   ├── ApiError.js        # Error handling
│   │   │   ├── ApiResponse.js     # Response formatting
│   │   │   └── asyncHandler.js    # Async error wrapper
│   │   └── app.js                 # Express app
│   ├── server.js                  # Entry point
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # API functions
│   │   ├── components/            # Reusable components
│   │   ├── pages/                 # Page components
│   │   │   ├── applicant/         # Applicant-specific pages
│   │   │   ├── auth/              # Authentication pages
│   │   │   ├── employer/          # Employer-specific pages
│   │   │   ├── jobs/              # Job browsing pages
│   │   │   └── shared/            # Shared pages (profile, 404)
│   │   ├── store/                 # Zustand stores
│   │   ├── hooks/                 # Custom hooks
│   │   ├── assets/                # Static assets
│   │   └── main.jsx
│   ├── public/
│   ├── .env
│   ├── Dockerfile
│   └── package.json
│
├── screenshots/
│
├── docker-compose.yml
└── README.md
```

---

## Development Notes

### Authentication Flow
- Access tokens are short-lived (30 minutes) and stored in memory
- Refresh tokens are long-lived (7 days), stored in the database, and sent as httpOnly cookies
- Token rotation occurs on each refresh request for security
- The frontend automatically refreshes tokens via an Axios interceptor

### Email Queue
- BullMQ handles email jobs asynchronously
- Two job types: `status-changed` and `new-application`

### File Uploads
- Avatars: JPEG/PNG, max 2MB, stored in `job-board/avatars`
- Resumes: PDF only, max 5MB, stored in `job-board/resumes`
- Files are uploaded directly to Cloudinary via streaming

### Soft Delete
- Jobs are soft-deleted (isDeleted flag) rather than hard-deleted
- This preserves data integrity and allows for recovery

---

## AI features

Optional AI features powered by **Google Gemini** (chat + embeddings) through LangChain and LangGraph. The whole feature set is **off by default-safe**: with no `GEMINI_API_KEY` the app boots and behaves exactly as before — `/api/ai/*` (except `/status`) and `/api/resumes/*` return `503`, and the UI hides every AI element.

### What it does

- **F1 — AI job summaries.** Every active job gets an async-generated summary (responsibilities, requirements, nice-to-haves, perks, experience level) stored in `JobInsight`. Shown on the job detail page; the owning employer can regenerate.
- **F2 — AI semantic search.** The "AI search" tab on the Jobs page understands natural language ("remote react developer 10+ LPA"), extracts filters, embeds the semantic remainder and ranks jobs by pgvector cosine similarity.
- **F3 — Similar jobs.** Up to 5 vector-similar jobs on every job detail page.
- **F4 — Resumes, recommendations, fit.** Applicants upload one PDF resume (text extracted, profile + embedding built async). `/recommended` ranks jobs for them; "Check my fit" scores a job against the resume; both exclude already-applied jobs. Applying can reuse the saved resume.
- **F5 — Cover letters & resume tips.** A LangGraph application assistant writes grounded cover letters (with a critique/revise loop, 3 tones) and job-specific resume tips with keywords to consider.

### Architecture

```
                         ┌────────────────────────── React (Vite) ──────────────────────────┐
                         │ Jobs (Keyword | AI search) · JobDetail (summary, similar, fit,    │
                         │ tips, apply+cover letter) · Profile (resume) · /recommended      │
                         └───────────────┬───────────────────────────────────────────────────┘
                                         │ axios
┌────────────────────────────────────────▼──────────────────────────────────────────────────┐
│ Express API                                                                                │
│  /api/ai/*  (search, similar, insights, recommendations, fit, cover-letter, resume-tips)   │
│  /api/resumes/*  (upload → text extraction → enqueue)                                      │
│  guards: requireAiEnabled · aiRateLimit (Redis) · aiDailyBudget (Redis) · validateRequest  │
│                                                                                            │
│   src/ai/  (LangChain chains · LangGraph graph · embeddings · prompts · cache · SQL repo)  │
└───────┬─────────────────────────────┬──────────────────────────────┬──────────────────────┘
        │ Prisma + raw SQL            │ BullMQ queue "ai"            │ Gemini API (chat + embeddings)
┌───────▼──────────┐          ┌───────▼───────────┐                  │
│ PostgreSQL 15    │          │ AI worker         │──────────────────┘
│ + pgvector       │◄─────────│ process-job       │  (same Node process as the API, like the
│ JobInsight,Resume│          │ process-resume    │   email worker)
└──────────────────┘          └───────────────────┘
           Redis: queue storage · embedding/parse/fit/tips cache · rate-limit counters
```

**Write path (async):** job create/update → `enqueueJobProcessing(jobId)` → worker computes insights (LLM) + embedding in parallel → stored in `JobInsight`. Resume upload → text extracted synchronously → `enqueueResumeProcessing(userId)` → worker extracts a structured profile (LLM) + embedding → stored in `Resume`.

**Read path (sync):** search, similar jobs and recommendations are SQL over stored vectors; fit analysis, cover letter and tips call Gemini inside the request (cached where deterministic).

**Idempotency:** every worker job recomputes a content hash and exits early when nothing changed, so duplicate/retried jobs are cheap and safe.

### Environment variables

Add to `backend/.env` (all optional — the app runs normally without them):

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | – | Get one at <https://aistudio.google.com/apikey>. `GOOGLE_API_KEY` is accepted as a fallback name. AI is active only if `AI_ENABLED=true` **and** a key is present. |
| `AI_ENABLED` | `true` | Set to `'false'` to disable all AI features without removing the key. |
| `GEMINI_CHAT_MODEL` | `gemini-3.5-flash-lite` | Model for insights, search parsing, fit, tips. |
| `GEMINI_WRITING_MODEL` | = chat model | Model for cover letters; empty ⇒ chat model. |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-2` | `gemini-embedding-2` or `gemini-embedding-001`; output is always 1536-d. |
| `GEMINI_THINKING_LEVEL` | `low` | `minimal`/`low`/`medium`/`high`; empty ⇒ parameter not sent. |
| `AI_REQUEST_TIMEOUT_MS` | `60000` | Per-call abort timeout. |
| `AI_SEARCH_MIN_SCORE` | `0` | Minimum cosine similarity for AI-search results (0 = rank only; tune after backfill). |
| `AI_DAILY_REQUEST_CAP` | `100` | Max LLM-invoking HTTP requests per UTC day. |
| `AI_WORKER_CONCURRENCY` | `1` | Background worker concurrency. |
| `AI_WORKER_RATE_PER_MINUTE` | `6` | Max background AI jobs started per minute (each ≈ 1 chat + 1 embedding call). |
| `TRUST_PROXY` | empty | Reverse-proxy hop count (e.g. `1` behind Nginx); needed for correct per-IP rate limiting. |

### Setup

1. **Node ≥ 22.3** everywhere (local, CI, Docker image, VPS).
2. **pgvector Postgres:** `docker compose pull postgres && docker compose up -d postgres redis`, then `npx prisma migrate deploy` (the migration creates the `vector` extension, `JobInsight`/`Resume` tables and the HNSW index). Verify: `docker exec job-board-postgres psql -U jobboard -d jobboard -c "SELECT name FROM pg_available_extensions WHERE name='vector';"`.
3. Set `GEMINI_API_KEY` (and optionally the other variables) in `backend/.env`.
4. `npm install` in `backend/` and `frontend/` (installs `@langchain/*`, `@google/genai`, `pdf-parse`, etc.).
5. Start the backend (`npm run dev`) — the AI worker starts automatically when a key is present.
6. **Backfill existing data:** `npm run ai:backfill` (processing happens in the running API process; at the default rate ~170 jobs take ~30 min).
7. **Smoke test the live Gemini integration:** `npm run ai:smoke` (add `-- --full` to also exercise the LangGraph cover-letter/tips flows).

### Cost & quota controls

- Per-endpoint Redis rate limits (search 20/min, fit 10/min, cover-letter & resume-tips 5/min, etc. — see the API table in the code).
- `AI_DAILY_REQUEST_CAP` caps LLM-invoking HTTP requests per UTC day (search, fit, cover-letter, resume-tips).
- BullMQ limiter (`AI_WORKER_RATE_PER_MINUTE`) plus automatic queue pausing when Gemini returns 429 — nothing fails, it just slows down.
- Embeddings and parsed search queries are cached in Redis; insight/fit/tips results are content-hash cached.
- The Gemini **free tier is quota-limited** (per-minute and per-day, per model — check AI Studio → rate limits). Rough usage: 1 job = 1 chat + 1 embedding call; uncached search ≈ 2 calls; cover letter ≈ 3–5 calls.

### Operations notes

- **Reverse proxy:** cover letters can take > 60 s — add `location /api/ai/ { proxy_read_timeout 120s; }` in Nginx and set `TRUST_PROXY=1` when exactly one proxy sits in front of the API.
- **Deploy order:** swap the Postgres image → `npx prisma migrate deploy` → set env vars → deploy → `npm run ai:backfill`.
- **Changing the embedding model:** vectors are not comparable across models; the content hash includes the model name, so just re-run `npm run ai:backfill` (resumes need a re-upload or "Try again").
- **Prompt/model changes:** bump `PROMPT_VERSION` in `src/ai/constants.js` for prompt changes, then re-run the backfill to regenerate insights.
- **Quota exhausted:** AI endpoints answer 503 (the UI falls back to keyword search) and the worker pauses and resumes by itself.
- **Turning AI off:** set `AI_ENABLED=false` or remove the key and restart. Stored data is kept.
- **Re-running the seed:** it wipes users/jobs (cascading to `JobInsight`/`Resume`) — re-run `npm run ai:backfill` afterwards.

### Privacy

Resume text and job text are sent to the **Gemini API**. On the Gemini **free tier Google may use prompts and responses to improve its products** (including human review); the paid tier does not. Therefore:

- Use only **fictional resumes** while developing and testing.
- **Enable billing (paid tier) before real people upload resumes.**
- Keep `LANGSMITH_TRACING` / `LANGCHAIN_TRACING_V2` **unset** — prompts would be sent to LangSmith.
- Never log prompts, resume text or the API key. `DELETE /api/resumes/me` removes the stored text, profile and embedding (the Cloudinary file is kept because past applications reference it).

### Scripts

| Command | Description |
|---|---|
| `npm run ai:smoke` (`-- --full`) | Live checks against the real Gemini API (embeddings, search parsing, insights, resume profile, fit, graph) |
| `npm run ai:backfill` (`-- --force`, `-- --limit N`) | Enqueue AI processing for existing jobs/resumes (server must be running) |
| `npm test` | Backend unit tests (`node --test`, no network/DB required) |

---

## Screenshots

### Job browsing page with filters
![Job browsing page with filters](screenshots/browseJobs.png)

### Job details
![Job details](screenshots/jobDetails.png)

### Job application form
![Job application form](screenshots/applyToJob.png)

### Applicant's applications page
![Applicant's application page](screenshots/myApplications.png)


### Employers's listings page
![Employer's Listing Page](screenshots/myListings.png)


### Employer listings management
![Listing Applicants](screenshots/listingApplicants.png)

![View Application](screenshots/applicationView.png)

### Employer dashboard
![Employer Dashboard](screenshots/dashboard.png)

---

## License

This project is for demonstration purposes.
