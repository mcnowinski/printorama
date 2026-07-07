# Fab-O-Rama

Job manager for the VT ME Dept 3D printer farm. Students submit fabrication requests; staff manage them through an approval workflow.

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Auth**: Supabase Auth — staff only (email/password), students are unauthenticated
- **Email**: Edge Functions + Resend (falls back to console.log mock when `RESEND_API_KEY` not set)
- **Hosting**: Static files on Apache at `fab-o-rama.grind.vt.domains` (SPA routing via `.htaccess`)

## Auth & Roles

- **MANAGER**: access to `/manage/*` except Users, Settings, and other-admin profiles
- **ADMINISTRATOR**: full access to all routes including user management and settings
- Students are unauthenticated and use public forms/RPCs for submission and status lookup
- Protected routes use `ProtectedRoute` component with optional `adminOnly` prop

## Schema (public tables)

### `system_settings`
Singleton row. Fields: `requests_open` (bool), `max_jobs_per_day` (int), `email_confirmation_required` (bool), `email_subject_prefix` (text), `site_url` (text), `created_at`, `updated_at`.

### `users`
Mirrors `auth.users`. Fields: `id` (FK auth.users), `name`, `email` (unique), `role` (MANAGER|ADMINISTRATOR), `created_at`, `updated_at`.

### `printers`
Physical 3D printers/tools. Fields: `name` (unique), `brand`, `model`, `location`, `status`, `notes`, `created_at`, `updated_at`. Printers with `status = 'OFFLINE'` are hidden from assignment dropdowns on the job form but still appear in the Settings tool list.

### `job_queue`
Incoming submissions awaiting staff review. Fields: `title`, `student_name`, `student_email`, `student_notes`, `file_url`, `original_filename`, `largest_dimension` (real), `dimension_unit` (default 'mm'), `job_type`, `status` (RECEIVED|APPROVED|REJECTED, default RECEIVED), `job_id` (FK jobs, set on approval). Indexed on email and status.

### `jobs`
Approved and in-progress/complete jobs. Fields: `title`, `student_name`, `student_email`, `student_notes`, `status`, `confirmation_token` (unique), `confirmed_at`, `file_url`, `original_filename`, `filament_type`, `filament_color`, `estimated_hours`, `largest_dimension`, `dimension_unit`, `job_type`, `printer_id` (FK printers), `assigned_to` (FK users), `submitted_at`, `created_at`, `updated_at`. Indexed on email, status, confirmation_token.

### `job_history`
Audit log for status and field changes. Fields: `job_id` (FK jobs, CASCADE), `field`, `old_value`, `new_value`, `created_at`. INSERT on this table where `field = 'status'` triggers the `job-status-email` Edge Function via DB webhook.

### `job_notes`
Staff notes on jobs. Fields: `job_id` (FK jobs, CASCADE), `content`, `created_by` (FK users), `created_at`, `updated_at`.

### `dropdown_options`
Configurable selectable options. Fields: `category` (JOB_STATUS|JOB_TYPE|FILAMENT_TYPE|FILAMENT_COLOR|ACCEPTED_FILE_TYPE), `label`, `sort_order`, `color`. Unique per (category, label).

## Status Lifecycle

**Queue** (`job_queue`):
```
RECEIVED → APPROVED (moved to jobs table, queue item deleted)
        → REJECTED (stays in queue)
```

**Jobs** (`jobs`):
```
RECEIVED → PROCESSING → FABRICATING → COMPLETE
                                        ↓
                 (any status) → FAILED
                              → CANCELLED

AWAITING_CONFIRMATION → RECEIVED (via email confirmation link)
```

Badge colors defined in `src/lib/colors.ts`:
- RECEIVED: warning, PROCESSING: secondary, FABRICATING: info, COMPLETE: success, FAILED: destructive, CANCELLED: default

## Routes

### Public
| Route | Page | Description |
|---|---|---|
| `/` | Landing.tsx | Two CTAs: Submit Job, Check Status. Redirects auth'd users to /manage |
| `/login` | Login.tsx | Staff sign-in form |
| `/request` | Request.tsx | Student submission form (checks `requests_open` before rendering) |
| `/status` | Status.tsx | Job lookup by email (sortable/paginated merged queue+jobs table) |
| `/status/:id` | StatusDetail.tsx | Student job detail with history timeline and notes |
| `/confirm` | ConfirmPage.tsx | Email confirmation page (reads `?token=` param) |

### Staff (protected)
| Route | Page | Access | Description |
|---|---|---|---|
| `/manage` | Dashboard.tsx | Any staff | Unified sortable/paginated table of queue + jobs. Inline "Add Job" form. Admin nav links |
| `/manage/queue/:id` | QueueDetail.tsx | Any staff | Review queue item: student info, file download, approve/reject |
| `/manage/jobs/:id` | JobDetail.tsx | Any staff | Edit job status, printer, job type, staff notes (add/edit/delete with confirm dialog), file download, history |
| `/manage/jobs/:id/history` | JobHistory.tsx | Any staff | Read-only timeline of all field changes |
| `/manage/users` | Users.tsx | Admin only | Staff account management: create (via Edge Function), edit inline, delete (last admin protected) |
| `/manage/settings` | Settings.tsx | Admin only | System settings, dropdown options CRUD, printer CRUD |
| `/manage/profile` | Profile.tsx | Self | Edit own name, email, password |
| `/manage/profile/:id` | Profile.tsx | Admin only | Edit any user's name, email, role, password |

## File Uploads

- Bucket: `job-files` (public)
- Max file size: 50 MB
- Extension validated client-side against `ACCEPTED_FILE_TYPE` dropdown options
- Storage path: `crypto.randomUUID() + '.' + originalExtension`
- Original filename saved in `original_filename` column
- Download utility in `src/lib/download.ts`: fetches blob and triggers download as `{title}_{studentName}_{date}.{ext}`

## Email Notifications

Two Edge Functions triggered by DB webhooks (INSERT):
- `job-queue-confirmation`: fires on `job_queue` INSERT, sends "job received" email
- `job-status-email`: fires on `job_history` INSERT where `field = 'status'`, sends status change email

Both use Resend or mock console.log if `RESEND_API_KEY` is not set. Email subject prefix and site URL come from `system_settings`.

## Key Library Files

| File | Description |
|---|---|
| `src/lib/supabase.ts` | Creates and exports Supabase client from env vars |
| `src/lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `src/lib/colors.ts` | Badge color maps for statuses and job types |
| `src/lib/download.ts` | `downloadFile()` for custom-named file downloads |

## RLS Pattern

- `anon` (students): INSERT on `job_queue`, SELECT on `jobs`/`printers`/`dropdown_options`/`system_settings`, EXECUTE on SECURITY DEFINER RPCs (`get_my_*`)
- `authenticated` (staff): ALL on all tables, with RLS policies restricting users table (self vs admin), printer writes (MANAGER/ADMIN only)

## Tests

- **Vitest** v4 + **React Testing Library** + **jsdom**
- **MSW** available but mock data used directly in current tests
- 5 test files in `src/__tests__/`: utils (5), Request (4), Status (2), Dashboard (4), Users (3)
- All tests use mocked `AuthContext` with hardcoded admin profile
- Run: `npx vitest run`
