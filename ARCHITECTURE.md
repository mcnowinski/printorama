# Printorama Architecture

## Overview

Printorama is a web-based job manager for a 3D printer server farm. It allows students to submit print job requests, managers to process those jobs, and administrators to manage the system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React 19 + TypeScript |
| **Styling** | Tailwind CSS v4 + custom shadcn/ui components |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Auth** | Supabase Auth (email/password for staff) |
| **Routing** | React Router v7 |

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
│       ├── admin/           # (removed — moved under /manage/)
│       ├── manage/          # Protected staff pages
│       │   ├── Dashboard.tsx    # Job queue + role-based quick links
│       │   ├── JobDetail.tsx    # Job edit (status, printer, notes)
│       │   ├── Settings.tsx     # Printers, system settings, dropdown options
│       │   └── Users.tsx        # Staff account management (admin only)
│       ├── Landing.tsx      # Public landing page
│       ├── Request.tsx      # Job submission form (student)
│       ├── Status.tsx       # Job lookup by email (student)
│       ├── StatusDetail.tsx # Job detail view (student)
│       ├── ConfirmPage.tsx  # Email confirmation handler
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
| `/request` | Public | Student job submission form |
| `/status` | Public | Job status lookup by email |
| `/status/:id` | Public | Individual job detail (student view) |
| `/login` | Public | Staff sign-in |
| `/confirm` | Public | Email confirmation handler |
| `/manage` | Staff (any role) | Dashboard — job queue + role-based quick links |
| `/manage/jobs/:id` | Staff (any role) | Edit job (status, printer, notes, delete) |
| `/manage/users` | Admin only | Invite, edit, remove staff accounts |
| `/manage/settings` | Admin only | Printer management, system config, dropdown options |

### Auth Flow

1. Staff logs in via `/login` with email + password
2. Supabase Auth validates credentials, returns session
3. `AuthContext` stores the session and fetches profile (name, role) from `users` table
4. `ProtectedRoute` checks `profile.role` — admins see all pages, managers see a subset
5. Students have no account — submit with name + email, receive job link via email

### UI Components

All UI primitives are in `src/components/ui/` and follow the shadcn/ui pattern — fully typed, accessible, with Tailwind dark mode variants. Components include:

- Button (variants: default, destructive, outline, secondary, ghost, link)
- Card (with Header, Content, Footer, Title, Description)
- Input, Textarea, Select
- Badge (variants: default, secondary, success, warning, destructive, info)
- Table (with Header, Body, Row, Head, Cell)

---

## Backend Architecture (Supabase)

### Schema

The database is PostgreSQL 15 with Row-Level Security (RLS) enabled on all tables.

```
Users (mirrors auth.users)
├── id          UUID (FK to auth.users)
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

Jobs
├── id                UUID
├── title             TEXT
├── student_name      TEXT
├── student_email     TEXT
├── status            TEXT (RECEIVED | PENDING | PRINTING | COMPLETE | FAILED | CANCELLED | AWAITING_CONFIRMATION)
├── confirmation_token TEXT (nullable, unique — set when email confirmation enabled)
├── confirmed_at      TIMESTAMPTZ
├── student_notes     TEXT
├── admin_notes       TEXT
├── filament_type     TEXT
├── filament_color    TEXT
├── printer_id        UUID (FK to printers)
├── assigned_to       UUID (FK to users)
└── timestamps

Notifications
├── id          UUID
├── job_id      UUID (FK to jobs)
├── recipient   TEXT (email)
├── type        TEXT (STATUS_CHANGE | CONFIRMATION | NEW_JOB_ALERT)
├── message     TEXT
├── sent_at     TIMESTAMPTZ (null = unsent)
└── timestamps

DropdownOptions
├── id          UUID
├── category    TEXT (JOB_STATUS | FILAMENT_TYPE | FILAMENT_COLOR)
├── label       TEXT
├── sort_order  INTEGER
└── timestamps

PrinterBrands / PrinterModels  (legacy — brand/model now free-text on Printer)
SystemSettings (singleton row)
├── requests_open              BOOLEAN
├── max_jobs_per_day           INTEGER
├── email_confirmation_required BOOLEAN
└── timestamps
```

### Row-Level Security

Each table has RLS policies that enforce role-based access:

- **Students**: Can insert jobs (anyone), can SELECT jobs matching their email via a session variable
- **Managers**: Can SELECT/UPDATE/DELETE all jobs and printers
- **Administrators**: Full access to all tables including users, settings, and dropdown options

Key helper function used in policies:
```sql
current_user_role()  -- returns the role of the currently authenticated user
```

### Edge Functions

Three Supabase Edge Functions (Deno/TypeScript):

| Function | Trigger | Purpose |
|---|---|---|
| `admin-create-user` | Admin invites a new staff member | Calls `supabase.auth.admin.inviteUserByEmail()`, inserts into `users` table |
| `send-notification` | Job status change | Sends email notification (currently mocked — logs to console) |
| `confirm-job` | Student clicks email link | Marks job as confirmed (status → RECEIVED) |

### Seed Data

`supabase/seed.sql` populates default dropdown options:
- Job Statuses: RECEIVED, PENDING, PRINTING, COMPLETE, FAILED, CANCELLED, AWAITING_CONFIRMATION
- Filament Types: PLA, PETG, ABS, TPU, Nylon, Resin
- Filament Colors: Black, White, Blue, Red, Green, Gray, Orange, Clear
- Printer Brands: Prusa, Bambu Lab, Creality, Anycubic (with models)

---

## Use Cases by Role

### Student (no authentication)

#### Submit a print job
1. Student navigates to `/request`
2. If the admin has closed submissions (`requests_open = false`), the page shows a "Submissions Closed" message
3. If open, the student fills in: name, email, notes
4. On submit, the job is inserted into the `jobs` table with status `RECEIVED`
5. If `email_confirmation_required` is enabled, the job starts as `AWAITING_CONFIRMATION`, a confirmation token is generated, and the system creates a notification record to send an email with a confirmation link
6. The student sees a confirmation message with their job link
7. If email confirmation is enabled, the student clicks the link in their email → `/confirm?token=xxx` → job status changes to `RECEIVED`

#### Check job status
1. Student navigates to `/status`
2. Enters their email address
3. System queries all jobs where `student_email` matches
4. Student sees a list of their jobs with title, status badge, and date
5. Clicking a job shows full details: status, timestamps, filament info, assigned printer, staff notes

#### Daily throttle
- The system checks how many jobs the student's email has submitted in the last 24 hours
- If the count exceeds `max_jobs_per_day` (configurable in Settings), the submission is blocked

---

### Manager (authenticated, role = MANAGER)

#### Sign in
1. Manager navigates to `/login`
2. Enters email + password
3. Supabase Auth validates credentials, returns a session
4. `AuthContext` loads the manager's profile from the `users` table
5. Redirected to `/manage`

#### View and manage the job queue
1. The Dashboard at `/manage` shows the full job queue table
2. Columns: title, student name/email, status (color-coded badge), assigned printer, submission date
3. Manager can filter by status and search by title/name/email
4. Clicking a job row opens `/manage/jobs/:id` for editing

#### Edit a job
1. Job detail page shows: title, student info, timestamps, filament, notes
2. Manager can change the **status** (RECEIVED → PENDING → PRINTING → COMPLETE/FAILED, etc.)
3. Manager can **assign a printer** from the dropdown (offline printers are labeled "(offline)")
4. Manager can add **staff notes** visible to the student
5. Saving triggers a notification record for a status-change email to the student
6. Manager can also **delete** the job

#### Add a job manually
1. From the Dashboard, click "Add Job" link above the queue
2. An inline form appears: title, status dropdown, student name, student email, notes
3. Submitting inserts the job directly — useful for walk-in students or phone/email requests

#### View printers (via Settings — admin only for editing)

---

### Administrator (authenticated, role = ADMINISTRATOR)

All manager capabilities, plus:

#### Manage staff accounts
1. Navigate to `/manage/users`
2. **Invite a new staff member**: enter name, email, and role (Manager or Administrator)
3. System calls the `admin-create-user` Edge Function, which invokes Supabase Auth's `inviteUserByEmail()` — the new user receives an email to set their password
4. **Edit existing users**: click the pencil icon on any row to inline-edit name, email, or role
5. **Remove a user**: click the × button — if they are the last remaining Administrator, the button is disabled and a message explains they must promote another user first

#### Manage printers
1. Navigate to `/manage/settings` → Printers section
2. **Add a printer**: click "Add Printer" — enter name, brand, model, location, status (Online/Offline radio buttons), and notes
3. **Remove a printer**: click Remove on any row
4. Offline printers are displayed at 50% opacity in the table and appear grayed out in the job queue and printer assignment dropdowns

#### Configure system settings
1. In the Settings page → Job Submissions section
2. **Toggle job submissions**: flip "Job Requests Open" to enable/disable the student submission form
3. **Toggle email confirmation**: flip "Email Confirmation Required" — when enabled, new jobs start as `AWAITING_CONFIRMATION` and students must click an email link before the job enters the queue
4. **Set daily throttle**: adjust "Max Jobs Per Day Per Email" (default: 3)

#### Manage dropdown options
1. In the Settings page → Options section
2. Select a category: Job Status, Filament Type, or Filament Color
3. **Add options**: type a label and click Add
4. **Edit options**: click the pencil icon to inline-edit the label and sort order
5. **Delete options**: click the trash icon to remove an option
6. These options populate dropdowns throughout the site (status selectors, filament pickers on the submission form, etc.)

#### Server-side: daily throttle enforcement
1. On job submission, the system counts jobs from that email in the last 24 hours
2. If ≥ `max_jobs_per_day`, the submission is rejected with a message
3. The throttle applies to both student submissions and manual staff additions

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
2. Run the migrations in `supabase/migrations/` (via SQL Editor or CLI)
3. Run the seed script
4. Deploy Edge Functions via `supabase functions deploy`
5. Create the first admin user via Auth panel + insert into `users` table

### Environment
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
