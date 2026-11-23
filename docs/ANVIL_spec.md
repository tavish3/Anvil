# Job Board — Project Specification

## Overview

A full-stack job board platform where **Employers** can post and manage job listings, and **Applicants** can search, apply, and track their applications. Built with a plain JavaScript stack, production-ready patterns, and Docker support.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache / Queues | Redis + BullMQ |
| File Uploads | Cloudinary |
| Email | Nodemailer (Gmail SMTP or Mailtrap for dev) |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| Containerisation | Docker + Docker Compose |
| Frontend | React + Vite (plain JS), TanStack Query v5, Zustand, React Router v6, Tailwind CSS |

---

## Project Structure

```
job-board/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # Prisma client
│   │   │   ├── redis.js           # ioredis client
│   │   │   ├── cloudinary.js      # Cloudinary SDK setup
│   │   │   └── env.js             # Zod-validated env vars
│   │   ├── middlewares/
│   │   │   ├── auth.js            # verifyAccessToken
│   │   │   ├── requireRole.js     # role guard (EMPLOYER / APPLICANT)
│   │   │   └── validate.js        # Zod request validation
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── auth.service.js
│   │   │   │   └── auth.schema.js
│   │   │   ├── users/
│   │   │   │   ├── user.routes.js
│   │   │   │   ├── user.controller.js
│   │   │   │   ├── user.service.js
│   │   │   │   └── user.schema.js
│   │   │   ├── jobs/
│   │   │   │   ├── job.routes.js
│   │   │   │   ├── job.controller.js
│   │   │   │   ├── job.service.js
│   │   │   │   └── job.schema.js
│   │   │   ├── applications/
│   │   │   │   ├── application.routes.js
│   │   │   │   ├── application.controller.js
│   │   │   │   ├── application.service.js
│   │   │   │   └── application.schema.js
│   │   │   └── dashboard/
│   │   │       ├── dashboard.routes.js
│   │   │       ├── dashboard.controller.js
│   │   │       └── dashboard.service.js
│   │   ├── queues/
│   │   │   ├── email.queue.js     # BullMQ queue definition
│   │   │   └── email.worker.js    # BullMQ worker (processes jobs)
│   │   ├── emails/
│   │   │   ├── mailer.js          # Nodemailer transporter
│   │   │   └── templates/
│   │   │       ├── statusChanged.js
│   │   │       └── newApplication.js
│   │   ├── utils/
│   │   │   ├── ApiError.js
│   │   │   ├── ApiResponse.js
│   │   │   └── asyncHandler.js
│   │   └── app.js                 # Express app setup
│   ├── server.js                  # Entry point
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # Axios instance + per-module API fns
│   │   ├── components/            # Shared UI components
│   │   ├── pages/
│   │   │   ├── auth/              # Login, Register, ResetPassword
│   │   │   ├── applicant/         # Browse jobs, My Applications
│   │   │   ├── employer/          # My Listings, Applicant Pipeline
│   │   │   └── shared/            # Profile, 404
│   │   ├── store/                 # Zustand (auth state)
│   │   ├── hooks/                 # Custom hooks wrapping TanStack Query
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml
```

---

## Database Schema

### User
```
id           String   @id @default(uuid())
email        String   @unique
passwordHash String
name         String
role         Role     (APPLICANT | EMPLOYER)
avatarUrl    String?
createdAt    DateTime @default(now())

relations:
  refreshTokens  RefreshToken[]
  passwordResets PasswordReset[]
  jobs           Job[]           (if EMPLOYER)
  applications   Application[]   (if APPLICANT)
```

### RefreshToken
```
id        String   @id @default(uuid())
token     String   @unique
userId    String
expiresAt DateTime
createdAt DateTime @default(now())
```

### PasswordReset
```
id        String   @id @default(uuid())
token     String   @unique
userId    String
expiresAt DateTime
used      Boolean  @default(false)
```

### Job
```
id            String      @id @default(uuid())
employerId    String
title         String
description   String
location      String
locationType  LocationType (REMOTE | ONSITE | HYBRID)
jobType       JobType      (FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP)
salaryMin     Int?
salaryMax     Int?
skills        String[]
deadline      DateTime?
isDeleted     Boolean     @default(false)
createdAt     DateTime    @default(now())
updatedAt     DateTime    @updatedAt

relations:
  employer     User
  applications Application[]
```

### Application
```
id            String            @id @default(uuid())
jobId         String
applicantId   String
status        ApplicationStatus (APPLIED | REVIEWING | INTERVIEW | OFFERED | REJECTED)
resumeUrl     String
coverLetter   String?
createdAt     DateTime          @default(now())
updatedAt     DateTime          @updatedAt

relations:
  job       Job
  applicant User
```

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register with name, email, password, role |
| POST | `/login` | Public | Returns access token + sets refresh token cookie |
| POST | `/refresh` | Public | Rotates refresh token, returns new access token |
| POST | `/logout` | Auth | Deletes refresh token from DB and clears cookie |
| POST | `/forgot-password` | Public | Sends reset email with tokenized link |
| POST | `/reset-password` | Public | Validates token, updates password |

### Users — `/api/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/me` | Auth | Get current user profile |
| PATCH | `/me` | Auth | Update name |
| PATCH | `/me/avatar` | Auth | Upload avatar to Cloudinary |

### Jobs — `/api/jobs`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List jobs with search + filters + pagination |
| GET | `/:id` | Public | Get single job detail |
| POST | `/` | Employer | Create a job listing |
| PATCH | `/:id` | Employer | Edit own listing |
| DELETE | `/:id` | Employer | Soft-delete own listing |
| GET | `/my/listings` | Employer | Get all own listings |

**Query params for GET `/`:**
- `q` — keyword (searches title + description)
- `location` — string match
- `locationType` — REMOTE | ONSITE | HYBRID
- `jobType` — FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP
- `salaryMin`, `salaryMax`
- `sortBy` — newest (default) | salaryAsc | salaryDesc
- `page`, `limit`

### Applications — `/api/applications`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/jobs/:jobId/apply` | Applicant | Apply to a job (resume upload via Cloudinary) |
| DELETE | `/:id/withdraw` | Applicant | Withdraw own application |
| GET | `/my` | Applicant | Get all own applications with current status |
| GET | `/jobs/:jobId` | Employer | Get all applicants for own listing |
| PATCH | `/:id/status` | Employer | Move applicant to next pipeline stage |

### Dashboard — `/api/dashboard`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/employer` | Employer | Total listings, total applications, breakdown by stage |

---

## Auth Flow

### Access + Refresh Token
- **Access token**: short-lived (15 min), sent in response body, stored in memory on client
- **Refresh token**: long-lived (7 days), stored in DB, sent as `httpOnly` cookie
- On access token expiry, client hits `/refresh` silently to get a new one
- On logout, refresh token deleted from DB and cookie cleared
- **Token rotation**: each `/refresh` call invalidates old token and issues a new one

### Password Reset
1. User hits `/forgot-password` with their email
2. A unique token (crypto.randomBytes) is generated, hashed, and stored in `PasswordReset` table with 15 min expiry
3. Email sent with link: `https://yourapp.com/reset-password?token=<raw_token>`
4. User submits new password → token validated, password updated, token marked as used

---

## Email Queue (BullMQ)

Two job types handled by the worker:

### `status-changed`
Triggered when employer updates an applicant's status.
```
payload: { applicantEmail, applicantName, jobTitle, newStatus }
```

### `new-application`
Triggered when applicant applies to a job.
```
payload: { employerEmail, employerName, jobTitle, applicantName }
```

Worker processes jobs with:
- 3 retry attempts on failure
- Exponential backoff between retries

---

## File Uploads (Cloudinary)

| Upload | Field | Accepted Types | Destination Folder |
|---|---|---|---|
| Avatar | `avatar` | image/jpeg, image/png | `job-board/avatars` |
| Resume | `resume` | application/pdf | `job-board/resumes` |

- `multer` used for `multipart/form-data` parsing (memory storage, no disk writes)
- File streamed directly to Cloudinary via upload stream
- Cloudinary URL saved to DB

---

## Role Guards

- `verifyAccessToken` middleware — validates JWT on protected routes
- `requireRole('EMPLOYER')` — 403 if user is not an employer
- `requireRole('APPLICANT')` — 403 if user is not an applicant
- Employers cannot apply to jobs; applicants cannot create listings

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jobboard

# Redis
REDIS_URL=redis://localhost:6379

# JWT
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Client
CLIENT_URL=http://localhost:5173
```

---

## Docker Setup

### `docker-compose.yml` services
- `postgres` — PostgreSQL 15
- `redis` — Redis 7 Alpine
- `backend` — Node.js backend (depends on postgres + redis)
- `frontend` — React app served via Nginx

### Dev workflow
```bash
docker compose up -d postgres redis   # start infra only
npm run dev                            # run backend locally with nodemon
```

---

## Frontend Pages

| Page | Role | Description |
|---|---|---|
| `/register` | Public | Register with role selection |
| `/login` | Public | Login |
| `/forgot-password` | Public | Request reset email |
| `/reset-password` | Public | Submit new password via token |
| `/jobs` | Public | Browse + search + filter jobs |
| `/jobs/:id` | Public | Job detail + apply button |
| `/profile` | Auth | Edit name, upload avatar |
| `/my-applications` | Applicant | Application list with status badges |
| `/my-listings` | Employer | All own job postings |
| `/my-listings/new` | Employer | Create listing form |
| `/my-listings/:id/edit` | Employer | Edit listing |
| `/my-listings/:id/applicants` | Employer | Pipeline view per listing |
| `/dashboard` | Employer | Stats overview |

---

## Implementation Order

1. Project scaffolding (backend + frontend + Docker infra)
2. Prisma schema + migrations
3. Auth module (register, login, refresh, logout)
4. Password reset flow
5. User profile + avatar upload
6. Jobs CRUD (employer)
7. Job search + filters (public)
8. Applications (apply, withdraw, track)
9. Pipeline management (employer)
10. BullMQ email queue + worker
11. Employer dashboard
12. Frontend — auth pages
13. Frontend — job browse + detail
14. Frontend — applicant dashboard
15. Frontend — employer listings + pipeline
16. Docker production setup + README
