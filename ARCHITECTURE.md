# Printorama Architecture

## Overview

Printorama is a web-based job manager for a 3D printer server farm. It allows students to submit print job requests, managers to review and approve those requests, and administrators to manage the system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React 19 + TypeScript |
| **Styling** | Tailwind CSS v4 + custom shadcn/ui components |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Auth** | Supabase Auth (email/password for staff) |
| **Routing** | React Router v7 |
| **File Storage** | Supabase Storage (bucket: `job-files`) |

---

## Frontend Architecture

```
frontend/
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── layout/          # App shell (Header, Layout)
│   │   └── ui/              # shadcn-style primitives (Button, Card, Table, Input, etc.)
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state management (user, profile, sign in/out)
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client initialization
│   │   └── utils.ts         # cn() helper for class merging
│   └── pages/
│       ├── manage/          # Protected staff pages
│       │   ├── Dashboard.tsx    # Unified All Requests table + role-based links
│       │   ├── JobDetail.tsx    # Job edit (status, printer, notes)
│       │   ├── Settings.tsx     # Printers, system settings, dropdown options
│       │   └── Users.tsx        # Staff account management (admin only)
│       ├── Landing.tsx      # Public landing page
│       ├── Request.tsx      # Job submission form (student → job_queue)
│       ├── Status.tsx       # Merged status lookup (queue + jobs)
│       ├── StatusDetail.tsx # Job detail view (student)
│       └── Login.tsx        # Staff sign-in form
│   ├── App.tsx              # Router + protected route wrappers
│   ├── index.css            # Tailwind import + base layer styles
│   └── main.tsx             # App entry point
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

### Routing

All staff routes are under `/manage/` and are protected by `ProtectedRoute`, which checks for an active Supabase session and loads the user's profile from the `users` table.

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page (redirects to `/manage` if authenticated) |
| `/request` | Public | Student job submission form (writes to `job_queue`) |
| `/status` | Public | Merged status lookup by email (queries both `job_queue` and `jobs`) |
| `/status/:id` | Public | Individual job detail (student view) |
| `/login` | Public | Staff sign-in |
| `/manage` | Staff (any role) | Dashboard — unified "All Requests" table + quick links |
| `/manage/jobs/:id` | Staff (any role) | Edit job (status, printer, notes, delete) |
| `/manage/users` | Admin only | Invite, edit, remove staff accounts |
| `/manage/settings` | Admin only | Printer management, system config, dropdown options |

### Auth Flow

1. Staff logs in via `/login` with email + password
2. Supabase Auth validates credentials, returns session
3. `AuthContext` stores the session and fetches profile (name, role) from `users` table
4. `ProtectedRoute` checks `profile.role` — admins see all pages, managers see a subset
5. Students have no account — submit with name + email, receive a confirmation message

### UI Components

All UI primitives are in `src/components/ui/` and follow the shadcn/ui pattern — fully typed, accessible, with Tailwind dark mode variants:

- Button (variants: default, destructive, outline, secondary, ghost, link)
- Card (with Header, Content, Footer, Title, Description)
- Input, Textarea, Select
- Badge (variants: default, secondary, success, warning, destructive, info)
- Table (with Header, Body, Row, Head, Cell)

---

## Backend Architecture (Supabase)

### Schema

The database is PostgreSQL. Row-Level Security (RLS) is enabled only on tables that staff access (`jobs`, `users`, etc.). The `job_queue` table has no RLS — it relies on PostgreSQL `GRANT` permissions instead.

```
Users (mirrors auth.users)
├── id          UUID (FK to auth.users ON DELETE CASCADE)
├── name        TEXT
├── email       TEXT (unique)
├── role        TEXT (MANAGER | ADMINISTRATOR)
└── timestamps

Printers
├── id          UUID
├── name        TEXT (unique)
├── brand       TEXT
├── model       TEXT
├── location    TEXT
├── status      TEXT (ONLINE | OFFLINE)
├── notes       TEXT
└── timestamps

JobQueue
├── id                UUID
├── student_name      TEXT
├── student_email     TEXT
├── student_notes     TEXT
├── file_url          TEXT
├── status            TEXT (PENDING | APPROVED | REJECTED)
├── job_id            UUID (FK to jobs, set when approved)
├── created_at        TIMESTAMPTZ
└── updated_at        TIMESTAMPTZ

Jobs
├── id                UUID
├── student_name      TEXT
├── student_email     TEXT
├── status            TEXT (RECEIVED | PENDING | PRINTING | COMPLETE | FAILED | CANCELLED)
├── student_notes     TEXT
├── admin_notes       TEXT
├── file_url          TEXT
├── printer_id        UUID (FK to printers)
├── assigned_to       UUID (FK to users)
└── timestamps

Notifications
├── id          UUID
├── job_id      UUID (FK to jobs ON DELETE CASCADE)
├── recipient   TEXT (email)
├── type        TEXT (STATUS_CHANGE | NEW_JOB_ALERT)
├── message     TEXT
├── sent_at     TIMESTAMPTZ (null = unsent)
└── timestamps

DropdownOptions
├── id          UUID
├── category    TEXT (JOB_STATUS | FILAMENT_TYPE | FILAMENT_COLOR | ACCEPTED_FILE_TYPE)
├── label       TEXT
├── sort_order  INTEGER
└── timestamps

SystemSettings (singleton row)
├── requests_open               BOOLEAN
├── max_jobs_per_day            INTEGER
├── email_confirmation_required BOOLEAN
└── timestamps
```

### Permissions Model

Instead of relying solely on RLS, the system uses a hybrid approach:

**Anonymous role** (students, unauthenticated):
- `INSERT, SELECT` on `job_queue` — submit and check queue items
- `SELECT` on `jobs` — check approved jobs by email
- `SELECT` on `printers`, `dropdown_options`, `system_settings` — public lookups

**Authenticated role** (managers, administrators):
- `ALL` on all tables — full CRUD via RLS policies

The `job_queue` table deliberately has **no RLS** — it uses GRANT-level permissions only. This avoids the RLS recursion issues that plagued an earlier version where `jobs` was open for anon INSERT.

### Row-Level Security

RLS is enabled on `jobs`, `users`, `printers`, and other staff-facing tables:

- **Students**: Can SELECT jobs matching their email via a session variable
- **Managers**: Can SELECT/UPDATE/DELETE all jobs and printers
- **Administrators**: Full access to all tables including users, settings, and dropdown options

Key helper function:
```sql
current_user_role()  -- returns the role from public.users for the authenticated user
```

This function does NOT use SECURITY DEFINER — it queries the `users` table under normal RLS. Since anonymous users never touch the `jobs` table directly, there's no recursion risk.

### Edge Functions

Three Supabase Edge Functions (Deno/TypeScript):

| Function | Trigger | Purpose |
|---|---|---|
| `admin-create-user` | Admin invites a new staff member | Calls `supabase.auth.admin.inviteUserByEmail()`, inserts into `users` table |
| `send-notification` | Job status change | Sends email notification (currently mocked — logs to console) |
| `confirm-job` | (Legacy — unused with queue approach) | Marks job as confirmed |

### Seed Data

`supabase/seed.sql` populates:
- Job Statuses: RECEIVED, PENDING, PRINTING, COMPLETE, FAILED, CANCELLED
- Filament Types: PLA, PETG, ABS, TPU, Nylon, Resin
- Filament Colors: Black, White, Blue, Red, Green, Gray, Orange, Clear
- Accepted File Types: stl, gcode, 3mf, obj
- Printer Brands/Models (legacy — brand/model are now free-text)

---

## Use Cases by Role

### Student (no authentication)

#### Submit a print job
1. Student navigates to `/request`
2. If `requests_open = false`, the page shows a "Submissions Closed" message
3. If open, the student fills in: name, email, notes, and optionally uploads a file
4. On submit, the record is inserted into `job_queue` with status `PENDING`
5. The student sees a confirmation message: "Your request is now in the review queue"

#### Check job status
1. Student navigates to `/status`
2. Enters their email address
3. System queries both `job_queue` and `jobs` — shows a merged chronological list
4. Queue items show as "Pending Review" (with file download if present)
5. Approved items link to the job detail page with full status information
6. Rejected items show as "Not Accepted"

---

### Manager (authenticated, role = MANAGER)

#### Sign in
1. Manager navigates to `/login`
2. Enters email + password
3. Supabase Auth validates credentials, returns a session
4. Redirected to `/manage`

#### Review and manage the request queue
1. The Dashboard at `/manage` shows a unified "All Requests" table
2. **Queue items** (PENDING) appear inline with a "Pending Review" badge
3. Each queue row has Approve and Reject buttons
4. Clicking Approve expands the row with:
   - Status dropdown (set the initial job status, e.g., RECEIVED, PENDING)
   - Printer assignment dropdown
   - Confirm button → copies the item to the `jobs` table, updates queue status to APPROVED
5. Clicking Reject marks the queue item as REJECTED (it disappears from the table)

#### Manage the job queue
1. **Jobs** (approved items) appear in the same table with their current status badge
2. Clicking a job row opens `/manage/jobs/:id` for editing
3. Managers can change status, assign printers, add staff notes, and delete jobs

#### Add a job manually
1. Click "Add Job" above the table → inline form appears
2. Enter student name, email, status, notes, and optional file
3. Submitting inserts directly into `jobs` — useful for walk-in students or phone/email requests

---

### Administrator (authenticated, role = ADMINISTRATOR)

All manager capabilities, plus:

#### Manage staff accounts
1. Navigate to `/manage/users`
2. **Invite**: enter name, email, role → Edge Function sends invite email
3. **Edit**: pencil icon → inline edit of name, email, or role
4. **Remove**: × button — disabled if user is the last remaining Administrator

#### Manage printers
1. Navigate to `/manage/settings` → Printers section
2. **Add**: name, brand, model, location, Online/Offline toggle, notes
3. **Remove**: click Remove on any row
4. Offline printers appear at 50% opacity and are grayed out in the job queue

#### Configure system settings
1. **Requests Open**: toggle to enable/disable the submission form
2. **Max Jobs Per Day**: daily throttle per email address
3. (Email confirmation toggle — legacy, replaced by queue)

#### Manage dropdown options
1. Categories: Job Status, Filament Type, Filament Color, Accepted File Type
2. Add, edit (pencil icon), delete options freely
3. Changes propagate instantly to all dropdowns throughout the site

---

## Data Flow Summary

```
Student                          Manager
   │                               │
   ├── Submit at /request          │
   │   └── INSERT into job_queue   │
   │       (status: PENDING)       │
   │                               ├── Dashboard sees queue items
   │                               ├── Click Approve
   │                               │   ├── INSERT into jobs
   │                               │   └── UPDATE job_queue status = APPROVED
   │                               ├── Click Reject
   │                               │   └── UPDATE job_queue status = REJECTED
   │                               │
   ├── Check /status               │
   │   └── Merged view:            │
   │       ├── queue (pending)     │
   │       └── jobs (approved)     │
   │                               ├── Click job → /manage/jobs/:id
   │                               │   └── Change status, assign printer
   │                               │
   │                               └── Settings (admin only)
   │                                   ├── Printers, Users
   │                                   ├── System config toggles
   │                                   └── Dropdown options
```

---

## Deployment

### Frontend
```
cd frontend
npm run build     # outputs static files to frontend/dist/
```
The static files can be served by any web server (Apache, Nginx, Vercel, Netlify, etc.).

### Backend (Supabase)
1. Create a Supabase project
2. Run these SQL files in `supabase/migrations/` in order (via SQL Editor or CLI):
   - `001_schema.sql` — tables, RLS policies, triggers
   - `002_printer_notes.sql` — add notes field to printers
   - `003_storage_bucket.sql` — create job-files storage bucket
   - `005_drop_title.sql` — drop the unused title column
   - `010_queue_cleanup.sql` — set up permissions for queue approach
   - `011_job_queue.sql` — create the job_queue table
3. Run `supabase/seed.sql` to populate default dropdown options
4. Deploy Edge Functions via `supabase functions deploy admin-create-user`
5. Create the first admin user via Auth panel, then:
   ```sql
   INSERT INTO users (id, name, email, role)
   VALUES ('uuid-from-auth', 'Your Name', 'email@vt.edu', 'ADMINISTRATOR');
   ```

### Environment
Create `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
