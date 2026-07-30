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
| **Backend Runtime** | Node.js |
| **Backend Framework** | Express.js |
| **Database** | PostgreSQL 15 |
| **ORM** | Prisma |
| **Cache / Queues** | Redis 7 + BullMQ |
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
