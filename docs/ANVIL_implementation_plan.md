# Job Board — Implementation Plan

> Each phase is self-contained and agent-executable. Always provide the agent with `job-board-spec.md` + this file at the start of each session. Tell the agent which phase to implement. Do not skip phases.

---

## Phase 0 — Project Scaffolding

**Goal:** Monorepo structure, backend and frontend initialized, Docker infra running, env setup done.

**Prompt:**
```
You are implementing Phase 0 of a Job Board project. Here is the full spec: [paste spec].

Do the following:
1. Create the monorepo folder structure as defined in the spec (job-board/backend, job-board/frontend)
2. Initialize backend: `npm init -y`, install dependencies:
   - express, prisma, @prisma/client, ioredis, bullmq, cloudinary, multer, nodemailer, jsonwebtoken, bcryptjs, zod, cors, cookie-parser, dotenv
   - devDependencies: nodemon
3. Create backend folder structure exactly as in the spec (config/, middlewares/, modules/, queues/, emails/, utils/)
4. Create placeholder index files in each folder so the structure is complete
5. Create `backend/.env.example` with all env vars from the spec
6. Create `backend/app.js` with Express setup (cors, cookie-parser, json body parser, mount routers as placeholders)
7. Create `backend/server.js` entry point
8. Initialize Prisma: `npx prisma init`
9. Initialize frontend: `npm create vite@latest frontend -- --template react`, then install:
   - axios, react-router-dom, @tanstack/react-query, zustand, tailwindcss
10. Create `docker-compose.yml` with postgres and redis services only (no backend/frontend containers yet)
11. Create `backend/utils/ApiError.js`, `ApiResponse.js`, `asyncHandler.js` with standard implementations
12. Create `backend/src/config/env.js` that uses Zod to validate all required env vars on startup

Do not implement any routes or business logic yet. Scaffolding only.
```

**Done when:**
- `docker compose up -d postgres redis` works
- `npm run dev` starts the backend without errors
- Frontend dev server starts with `npm run dev`

---

## Phase 1 — Prisma Schema + Migrations

**Goal:** All database models defined, migration run, Prisma client generated.

**Prompt:**
```
You are implementing Phase 1 of a Job Board project. Here is the full spec: [paste spec].

The project scaffolding from Phase 0 is already done.

Do the following:
1. Write the complete Prisma schema in `backend/prisma/schema.prisma` with these models:
   - User (with Role enum: APPLICANT, EMPLOYER)
   - RefreshToken
   - PasswordReset
   - Job (with JobType enum, LocationType enum)
   - Application (with ApplicationStatus enum: APPLIED, REVIEWING, INTERVIEW, OFFERED, REJECTED)
   - All relations as defined in the spec
2. Add all necessary indexes (email unique, token unique, foreign keys)
3. Run `npx prisma migrate dev --name init`
4. Run `npx prisma generate`
5. Create `backend/src/config/db.js` that exports the Prisma client singleton

Provide the complete schema.prisma file and confirm migration commands.
```

**Done when:**
- `npx prisma studio` shows all 5 tables
- No migration errors

---

## Phase 2 — Auth Module (Register, Login, Refresh, Logout)

**Goal:** Core JWT auth working with access + refresh token rotation.

**Prompt:**
```
You are implementing Phase 2 of a Job Board project. Here is the full spec: [paste spec].

Phases 0 and 1 are complete. The Prisma schema is migrated and the project is scaffolded.

Implement the full Auth module:
1. `auth.schema.js` — Zod schemas for register, login
2. `auth.service.js` — implement:
   - registerUser: hash password with bcryptjs, create user, generate tokens
   - loginUser: verify password, generate tokens, store refresh token in DB
   - refreshTokens: verify refresh token cookie against DB, rotate (delete old, create new), return new access token
   - logoutUser: delete refresh token from DB, clear cookie
3. `auth.controller.js` — call service methods, set refresh token as httpOnly cookie, return ApiResponse
4. `auth.routes.js` — POST /register, /login, /refresh, /logout
5. `middlewares/auth.js` — verifyAccessToken middleware: extract Bearer token, verify JWT, attach user to req
6. `middlewares/requireRole.js` — takes role string, returns middleware that checks req.user.role
7. `middlewares/validate.js` — Zod validation middleware factory
8. Mount auth routes in app.js at /api/auth

Token config:
- Access token: 15m expiry, payload: { userId, role }
- Refresh token: 7d expiry, stored in DB, sent as httpOnly cookie named `refreshToken`
- Token rotation: each /refresh call deletes old refresh token row and creates new one

Return all files with complete implementations, no TODOs.
```

**Done when:**
- POST /api/auth/register creates user and returns access token
- POST /api/auth/login returns access token and sets cookie
- POST /api/auth/refresh rotates token
- POST /api/auth/logout clears cookie and deletes DB row
- Protected route with verifyAccessToken works

---

## Phase 3 — Password Reset Flow

**Goal:** Forgot password + reset password via tokenized email link.

**Prompt:**
```
You are implementing Phase 3 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–2 are complete. Auth (register, login, refresh, logout) is working.

Implement the password reset flow:
1. `emails/mailer.js` — create Nodemailer transporter using SMTP env vars
2. `emails/templates/passwordReset.js` — export a function that returns HTML email with reset link
3. In `auth.service.js`, add:
   - forgotPassword: find user by email (silently succeed if not found to prevent enumeration), generate crypto.randomBytes(32) token, hash it with SHA-256, store hash in PasswordReset table with 15min expiry, send email with raw token in link as: CLIENT_URL/reset-password?token=<rawToken>
   - resetPassword: find PasswordReset row by hashed token, check not expired and not used, update user password, mark token as used
4. Add Zod schemas for both endpoints
5. Add controller methods and routes: POST /api/auth/forgot-password, POST /api/auth/reset-password
6. Reset password body: { token, newPassword }

Return all updated files with complete implementations.
```

**Done when:**
- Forgot password sends email (use Mailtrap in dev)
- Reset link token validates correctly
- Password updates successfully
- Token cannot be reused

---

## Phase 4 — User Profile + Avatar Upload

**Goal:** Get/update profile, upload avatar to Cloudinary.

**Prompt:**
```
You are implementing Phase 4 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–3 are complete.

Implement the Users module:
1. `config/cloudinary.js` — configure Cloudinary SDK with env vars
2. Create a `utils/uploadToCloudinary.js` helper that takes a file buffer and folder name, returns a Promise that resolves to the secure_url using upload_stream
3. `user.schema.js` — Zod schema for updating name
4. `user.service.js`:
   - getMe: return user from DB by id (exclude passwordHash)
   - updateMe: update name
   - updateAvatar: upload buffer to Cloudinary folder `job-board/avatars`, update avatarUrl in DB
5. `user.controller.js` — handle all three
6. `user.routes.js`:
   - GET /me — verifyAccessToken
   - PATCH /me — verifyAccessToken + validate
   - PATCH /me/avatar — verifyAccessToken + multer memoryStorage (single file field `avatar`, accept image/jpeg and image/png only, max 2MB)
7. Mount at /api/users in app.js

Return all files with complete implementations.
```

**Done when:**
- GET /api/users/me returns user profile
- PATCH /api/users/me updates name
- PATCH /api/users/me/avatar uploads to Cloudinary and saves URL

---

## Phase 5 — Jobs Module (Employer CRUD)

**Goal:** Employers can create, edit, soft-delete, and view their own listings.

**Prompt:**
```
You are implementing Phase 5 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–4 are complete.

Implement the Jobs module — employer side only:
1. `job.schema.js` — Zod schemas for create and update (all fields from spec, deadline as ISO string coerced to Date)
2. `job.service.js`:
   - createJob: create listing tied to req.user.id
   - updateJob: verify ownership, update fields
   - softDeleteJob: verify ownership, set isDeleted = true
   - getMyListings: return all non-deleted listings for the employer with _count of applications
3. `job.controller.js`
4. `job.routes.js`:
   - POST / — verifyAccessToken + requireRole('EMPLOYER') + validate
   - PATCH /:id — verifyAccessToken + requireRole('EMPLOYER') + validate
   - DELETE /:id — verifyAccessToken + requireRole('EMPLOYER')
   - GET /my/listings — verifyAccessToken + requireRole('EMPLOYER')
5. Mount at /api/jobs in app.js

Important: soft delete means isDeleted = true, not actual row deletion. Always filter isDeleted: false in queries unless explicitly needed.

Return all files with complete implementations.
```

**Done when:**
- Employer can create, edit, soft-delete listings
- GET /my/listings returns only that employer's listings
- Non-employers get 403

---

## Phase 6 — Job Search + Filters (Public)

**Goal:** Public endpoint to browse and search jobs with filters and pagination.

**Prompt:**
```
You are implementing Phase 6 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–5 are complete.

Add public job browsing to the Jobs module:
1. `job.schema.js` — add Zod schema for query params: q, location, locationType, jobType, salaryMin, salaryMax, sortBy, page, limit (all optional, with defaults: page=1, limit=10, sortBy=newest)
2. `job.service.js` — add getJobs:
   - Filter: isDeleted = false, deadline is null or >= now
   - If q provided: search title and description using Prisma contains (case-insensitive mode)
   - Apply locationType, jobType filters if provided
   - Salary: if salaryMin provided, filter salaryMax >= salaryMin; if salaryMax provided, filter salaryMin <= salaryMax
   - Sort: newest = createdAt desc, salaryAsc = salaryMin asc, salaryDesc = salaryMax desc
   - Pagination: skip + take
   - Return: { jobs, total, page, totalPages }
3. `job.controller.js` — add getJobs handler
4. `job.routes.js` — add GET / (public, no auth needed) + GET /:id (public)
5. `job.service.js` — add getJobById: return job with employer name and avatar, exclude soft-deleted

Return all updated files.
```

**Done when:**
- GET /api/jobs returns paginated results
- Filters and sorting work correctly
- GET /api/jobs/:id returns job detail with employer info

---

## Phase 7 — Applications Module

**Goal:** Applicants can apply, withdraw, and track. Employers can view applicants and move pipeline.

**Prompt:**
```
You are implementing Phase 7 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–6 are complete.

Implement the Applications module:
1. `application.schema.js` — Zod schema for status update (enum: APPLIED, REVIEWING, INTERVIEW, OFFERED, REJECTED)
2. `application.service.js`:
   - applyToJob: 
     - Check job exists, not deleted, deadline not passed
     - Check applicant hasn't already applied (return 409 if so)
     - Upload resume PDF to Cloudinary folder `job-board/resumes`
     - Create application with status APPLIED
   - withdrawApplication: verify ownership + status is APPLIED only, delete row
   - getMyApplications: return all applications for applicant with job title, company name, status, createdAt
   - getJobApplicants: verify employer owns the job, return all applicants with user name, email, avatarUrl, resumeUrl, status, createdAt
   - updateApplicationStatus:
     - Verify employer owns the job the application belongs to
     - Update status
     - Enqueue email notification job (status-changed)
3. `application.controller.js`
4. `application.routes.js`:
   - POST /jobs/:jobId/apply — verifyAccessToken + requireRole('APPLICANT') + multer for resume (PDF only, max 5MB)
   - DELETE /:id/withdraw — verifyAccessToken + requireRole('APPLICANT')
   - GET /my — verifyAccessToken + requireRole('APPLICANT')
   - GET /jobs/:jobId — verifyAccessToken + requireRole('EMPLOYER')
   - PATCH /:id/status — verifyAccessToken + requireRole('EMPLOYER') + validate
5. Mount at /api/applications in app.js

Return all files with complete implementations.
```

**Done when:**
- Applicant can apply with PDF resume
- Duplicate application returns 409
- Employer can view applicants and update status
- Status update enqueues an email job

---

## Phase 8 — BullMQ Email Queue + Worker

**Goal:** Email notifications sent async via BullMQ for status changes and new applications.

**Prompt:**
```
You are implementing Phase 8 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–7 are complete. Applications module is working but email jobs are being enqueued without a worker yet.

Implement the email queue system:
1. `queues/email.queue.js` — create and export a BullMQ Queue named `email` using the Redis connection from config/redis.js
2. `queues/email.worker.js` — create a BullMQ Worker on the `email` queue:
   - Handle job type `status-changed`: send email to applicant notifying them their application status changed, include job title and new status in the email body
   - Handle job type `new-application`: send email to employer notifying them someone applied to their listing, include applicant name and job title
   - Worker options: 3 attempts, exponential backoff (base 5000ms)
3. `emails/templates/statusChanged.js` — HTML email template function
4. `emails/templates/newApplication.js` — HTML email template function
5. Update `server.js` to import and start the worker
6. Update `application.service.js` to also enqueue a `new-application` job when applyToJob is called (employer email notification)

Use Mailtrap SMTP for development. Document how to switch to Gmail for production in a comment.

Return all files with complete implementations.
```

**Done when:**
- Status change triggers email to applicant
- New application triggers email to employer
- Failed jobs retry with backoff - YET TO BE DONE
- Worker logs successful deliveries

---

## Phase 9 — Employer Dashboard

**Goal:** Aggregated stats for the employer.

**Prompt:**
```
You are implementing Phase 9 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–8 are complete.

Implement the Dashboard module:
1. `dashboard.service.js` — getEmployerDashboard(userId):
   - totalListings: count of non-deleted jobs by this employer
   - totalApplications: count of all applications across employer's jobs
   - byStage: count of applications grouped by status (APPLIED, REVIEWING, INTERVIEW, OFFERED, REJECTED)
   - recentListings: last 5 listings with title, createdAt, application count
   Use Prisma aggregations and groupBy. Do this in as few queries as possible.
2. `dashboard.controller.js`
3. `dashboard.routes.js` — GET /api/dashboard/employer — verifyAccessToken + requireRole('EMPLOYER')
4. Mount in app.js

Return all files with complete implementations.
```

**Done when:**
- GET /api/dashboard/employer returns correct counts
- byStage reflects actual application statuses

---

## Phase 10 — Frontend: Auth Pages

**Goal:** Register, Login, Forgot Password, Reset Password pages wired to backend.

**Prompt:**
```
You are implementing Phase 10 of a Job Board project. Here is the full spec: [paste spec].

The backend (Phases 0–9) is fully complete. Now start the frontend.

Tech: React + Vite (plain JS), TanStack Query v5, Zustand, React Router v6, Tailwind CSS, Axios.

Do the following:
1. `src/api/axios.js` — Axios instance with baseURL from env, withCredentials: true, response interceptor that on 401 calls /auth/refresh silently and retries the original request once, then logs out if refresh also fails
2. `src/store/authStore.js` — Zustand store with: user, accessToken, setAuth(user, token), clearAuth()
3. `src/api/auth.js` — functions: register, login, logout, forgotPassword, resetPassword (each calls the backend endpoint)
4. `src/hooks/useAuth.js` — custom hook wrapping TanStack Query mutations for each auth action
5. Pages (clean, functional UI with Tailwind):
   - `/register` — name, email, password, role selector (Applicant / Employer)
   - `/login` — email, password
   - `/forgot-password` — email input, success message after submit
   - `/reset-password` — reads ?token from URL, new password input
6. `src/components/ProtectedRoute.jsx` — redirects to /login if no accessToken in store
7. `src/components/RoleRoute.jsx` — redirects to / if user role doesn't match
8. Setup React Router in `main.jsx` with all routes from the spec

Return all files with complete implementations.
```

**Done when:**
- Register creates account and redirects to login
- Login stores token in Zustand and redirects to /jobs
- Refresh token interceptor silently renews session
- Protected routes redirect unauthenticated users

---

## Phase 11 — Frontend: Job Browse + Detail

**Goal:** Public job listing page with search/filters and individual job detail page.

**Prompt:**
```
You are implementing Phase 11 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–10 are complete. Auth pages are working.

Implement:
1. `src/api/jobs.js` — getJobs(params), getJobById(id)
2. `src/hooks/useJobs.js` — TanStack Query hooks for both
3. `/jobs` page:
   - Search bar (q), location input, dropdowns for locationType and jobType, salary range inputs
   - Job cards: title, company, location, job type, salary range, deadline, posted date
   - Pagination controls
   - Filter state managed in URL search params (so filters are shareable/bookmarkable)
4. `/jobs/:id` page:
   - Full job detail
   - Apply button (visible to APPLICANT only, hidden if already applied or deadline passed)
   - Apply modal: resume PDF upload + optional cover letter textarea
5. `src/api/applications.js` — applyToJob(jobId, formData)
6. `src/hooks/useApplications.js` — mutation for applying

Return all files with complete implementations.
```

**Done when:**
- Job listing page loads with filters working
- Filters update URL params and re-fetch
- Apply modal submits correctly and shows success

---

## Phase 12 — Frontend: Applicant Dashboard

**Goal:** Applicant can track all their applications and withdraw.

**Prompt:**
```
You are implementing Phase 12 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–11 are complete.

Implement the Applicant Dashboard:
1. `src/api/applications.js` — add getMyApplications(), withdrawApplication(id)
2. `src/hooks/useApplications.js` — add queries/mutations for both
3. `/my-applications` page (RoleRoute: APPLICANT only):
   - Table or card list of all applications
   - Columns: job title, company, applied date, current status (colored badge per stage), action
   - Withdraw button visible only if status is APPLIED, with confirmation dialog
   - Empty state when no applications

Return all files with complete implementations.
```

**Done when:**
- Applicant sees all applications with correct statuses
- Withdraw works and updates list

---

## Phase 13 — Frontend: Employer Listings + Pipeline

**Goal:** Employer can manage listings and move applicants through the pipeline.

**Prompt:**
```
You are implementing Phase 13 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–12 are complete.

Implement Employer pages:
1. `src/api/jobs.js` — add createJob, updateJob, deleteJob, getMyListings
2. `src/api/applications.js` — add getJobApplicants(jobId), updateApplicationStatus(id, status)
3. `src/hooks/useEmployer.js` — TanStack Query hooks for all of the above
4. `/my-listings` page (RoleRoute: EMPLOYER):
   - List of own job postings with title, applicant count, status (active/expired/deleted), created date
   - New Listing button → /my-listings/new
   - Edit and Delete buttons per listing
5. `/my-listings/new` and `/my-listings/:id/edit` pages:
   - Form: title, description, location, locationType, jobType, salaryMin, salaryMax, skills (tag input), deadline
6. `/my-listings/:id/applicants` page:
   - List of applicants with name, email, avatar, resume link, current status
   - Status dropdown per applicant to move through pipeline stages
   - Updating status triggers optimistic UI update
7. `/dashboard` page (RoleRoute: EMPLOYER):
   - Stat cards: total listings, total applications
   - Stage breakdown (bar or simple count display)
   - Recent listings table

Return all files with complete implementations.
```

**Done when:**
- Employer can create, edit, delete listings
- Pipeline status updates work and trigger emails
- Dashboard shows correct stats

---

## Phase 14 — Profile Page + Polish

**Goal:** Profile page, avatar upload, global error handling, loading states.

**Prompt:**
```
You are implementing Phase 14 of a Job Board project. Here is the full spec: [paste spec].

Phases 0–13 are complete. This is the final frontend phase.

Do the following:
1. `/profile` page (Auth only):
   - Display current name and avatar
   - Edit name inline
   - Avatar upload with preview before submit
2. Global error boundary component wrapping the router
3. 404 page for unmatched routes
4. Navbar component:
   - Logo, Jobs link (public)
   - If APPLICANT: My Applications link
   - If EMPLOYER: My Listings, Dashboard links
   - Avatar + logout button when logged in
   - Login / Register when logged out
5. Add loading skeletons to job listing and application pages
6. Add toast notifications (use a lightweight lib like react-hot-toast) for:
   - Successful apply, withdraw, status update, profile update
   - Error messages from API responses

Return all files with complete implementations.
```

**Done when:**
- Profile page works with avatar upload
- Navbar reflects correct auth state
- Toasts appear on key actions
- No unhandled loading/error states

---

## Phase 15 — In-App Notifications (Backend)
 
**Goal:** Notification model in DB, full notifications module (service, controller, routes), triggers wired into application.service.js alongside existing email logic.
 
**Prompt:**
```
You are implementing Phase 15 of a Job Board project. Here is the full spec: [paste spec].
 
Phases 0–14 are complete. The email queue (BullMQ) is already working. Now add the backend for in-app notifications on top of the existing email triggers — do not remove or replace any email logic, only add alongside it.
 
1. Prisma schema — add a new model to `prisma/schema.prisma`:
 
   model Notification {
     id        String   @id @default(uuid())
     userId    String
     message   String
     isRead    Boolean  @default(false)
     createdAt DateTime @default(now())
 
     user User @relation(fields: [userId], references: [id], onDelete: Cascade)
   }
 
   Add the reverse relation on User: notifications Notification[]
 
   Run: `npx prisma migrate dev --name add_notifications`
   Run: `npx prisma generate`
 
2. Create `backend/src/modules/notifications/` with:
 
   a. `notification.service.js`:
      - createNotification(userId, message): creates a Notification row — this is a shared internal helper, not exposed directly to controllers, called by other services
      - getNotifications(userId): return all notifications for the user ordered by createdAt desc, limit 20
      - markAsRead(notificationId, userId): find notification by id, verify it belongs to userId (return 403 if not), set isRead = true, return updated row
      - markAllAsRead(userId): update all where userId matches and isRead = false, set isRead = true
      - getUnreadCount(userId): return count of notifications where userId matches and isRead = false
 
   b. `notification.controller.js`:
      - getNotifications: call getNotifications(req.user.id), return list
      - markAsRead: call markAsRead(req.params.id, req.user.id), return updated notification
      - markAllAsRead: call markAllAsRead(req.user.id), return success message
      - getUnreadCount: call getUnreadCount(req.user.id), return { count }
 
   c. `notification.routes.js`:
      - All routes require verifyAccessToken (no requireRole — both roles receive notifications)
      - GET    /                  → getNotifications
      - GET    /unread-count      → getUnreadCount
      - PATCH  /:id/read          → markAsRead
      - PATCH  /read-all          → markAllAsRead
 
3. Mount notifications router in `app.js` at `/api/notifications`
 
4. Update `application.service.js` — in two places, import createNotification and call it alongside the existing email enqueue:
 
   a. In applyToJob (after application is created):
      - createNotification(job.employerId, `${applicant.name} applied to your listing "${job.title}"`)
      - Keep the existing new-application email enqueue untouched
 
   b. In updateApplicationStatus (after status is updated):
      - createNotification(application.applicantId, `Your application for "${job.title}" has been moved to ${newStatus}`)
      - Keep the existing status-changed email enqueue untouched
 
Return all new and modified files with complete implementations. Do not break any existing functionality.
```
 
**Done when:**
- Migration runs without errors, Notification table exists
- GET /api/notifications returns correct list for the logged-in user
- GET /api/notifications/unread-count returns correct count
- PATCH /api/notifications/:id/read marks a single notification as read (returns 403 if not owned by user)
- PATCH /api/notifications/read-all marks all as read
- Applying to a job creates a notification row for the employer
- Updating application status creates a notification row for the applicant
- Existing email queue behaviour is unchanged
---
 
## Phase 16 — In-App Notifications (Frontend)
 
**Goal:** Bell icon in navbar for logged-in users only, dropdown with notification list, polling, mark as read.
 
**Prompt:**
```
You are implementing Phase 16 of a Job Board project. Here is the full spec: [paste spec].
 
Phases 0–15 are complete. The notifications backend is fully working — all endpoints are tested and returning correct data. Now build the frontend for in-app notifications.
 
1. Install date-fns if not already present: `npm install date-fns`
 
2. `src/api/notifications.js` — create API functions using the existing Axios instance:
   - getNotifications(): GET /api/notifications
   - getUnreadCount(): GET /api/notifications/unread-count
   - markAsRead(id): PATCH /api/notifications/:id/read
   - markAllAsRead(): PATCH /api/notifications/read-all
 
3. `src/hooks/useNotifications.js` — TanStack Query hooks:
   - useUnreadCount(): 
     - useQuery with queryKey: ['notifications', 'unreadCount']
     - calls getUnreadCount()
     - refetchInterval: 30000 (30s polling)
     - IMPORTANT: check Zustand auth store for accessToken — if not present, set enabled: false so this query never fires for guests
   - useNotifications():
     - useQuery with queryKey: ['notifications']
     - calls getNotifications()
     - enabled only when user is logged in (same accessToken check)
   - useMarkAsRead():
     - useMutation calling markAsRead(id)
     - onSuccess: invalidate both ['notifications'] and ['notifications', 'unreadCount'] query keys
   - useMarkAllAsRead():
     - useMutation calling markAllAsRead()
     - onSuccess: invalidate both ['notifications'] and ['notifications', 'unreadCount'] query keys
 
4. `src/components/NotificationBell.jsx`:
   - Uses useUnreadCount(), useNotifications(), useMarkAsRead(), useMarkAllAsRead()
   - Renders a bell icon (lucide-react Bell)
   - If unread count > 0: show a red badge on the bell, display count capped at "99+"
   - On click: toggle a dropdown panel below the bell
   - Dropdown:
     - "Mark all as read" button at the top — calls useMarkAllAsRead, disabled if unreadCount is 0
     - List of notifications ordered newest first (already ordered from backend)
     - Each notification row:
       - Message text
       - Relative time using date-fns formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
       - Unread rows have a visually distinct background (e.g. light blue or highlighted)
       - Clicking an unread row calls markAsRead(notification.id) — read rows are not clickable for this action
     - Empty state: centred "No notifications yet" text when list is empty
   - Dropdown closes when clicking outside — implement with a useRef on the container and a useEffect that adds a mousedown listener to document, removes it on cleanup
 
5. Update `src/components/Navbar.jsx` (already built in Phase 14):
   - Import NotificationBell
   - Read accessToken from Zustand auth store
   - Render NotificationBell ONLY when accessToken is present — not even a disabled or hidden version for guests
   - Position: to the left of the avatar/logout button
   - Non-logged-in navbar remains: Logo, Jobs link, Login button, Register button — no bell at all
 
Return all new and modified files with complete implementations. Do not break any existing functionality.
```
 
**Done when:**
- Bell icon appears in navbar only when logged in
- Unread count badge updates every 30 seconds via polling
- Clicking the bell opens the dropdown with the notification list
- Unread notifications are visually distinct from read ones
- Clicking an unread notification marks it as read and updates the badge immediately
- Mark all as read works and clears the badge
- Dropdown closes on outside click
- No network requests to /api/notifications fire when user is not logged in
---
 
## Phase 17 — README
 
**Goal:** Production-ready README with setup instructions.
 
**Prompt:**
```
You are implementing Phase 17 of a Job Board project. Here is the full spec: [paste spec].
 
All previous phases (0–16) are complete. This is the final phase.
 
Do the following:
1. Write a thorough `README.md` at the root with:
   - Project overview and feature list
   - Tech stack table
   - Architecture diagram (ASCII is fine)
   - Local dev setup instructions (step by step)
   - Docker setup instructions
   - All environment variables explained
   - API endpoint reference (summary table)
   - Screenshots section placeholder
 
Return all files with complete content.
```
 
**Done when:**
- README is thorough enough to impress a hiring manager
---
 
## Summary
 
| Phase | What gets built |
|---|---|
| 0 | Scaffolding, folder structure, Docker infra |
| 1 | Prisma schema + migrations |
| 2 | Auth — register, login, refresh, logout |
| 3 | Password reset flow |
| 4 | User profile + avatar upload |
| 5 | Jobs CRUD (employer) |
| 6 | Job search + filters (public) |
| 7 | Applications — apply, withdraw, pipeline |
| 8 | BullMQ email queue + worker |
| 9 | Employer dashboard API |
| 10 | Frontend — auth pages |
| 11 | Frontend — job browse + detail |
| 12 | Frontend — applicant dashboard |
| 13 | Frontend — employer listings + pipeline |
| 14 | Frontend — profile, navbar, polish |
| 15 | In-app notifications — backend (Prisma model, service, controller, routes, triggers) |
| 16 | In-app notifications — frontend (api, hooks, NotificationBell, Navbar update) |
| 17 | README |