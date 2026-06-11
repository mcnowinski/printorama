-- 001_schema.sql
-- Printorama Database Schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PUBLIC SCHEMA
-- ============================================================

-- System settings (singleton row)
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requests_open BOOLEAN NOT NULL DEFAULT true,
  max_jobs_per_day INTEGER NOT NULL DEFAULT 3,
  email_confirmation_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton row
INSERT INTO system_settings (id) VALUES (gen_random_uuid());

-- Users (mirrors auth.users, stores role)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('MANAGER', 'ADMINISTRATOR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Printer brands
CREATE TABLE printer_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Printer models (linked to brand)
CREATE TABLE printer_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_id UUID NOT NULL REFERENCES printer_brands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Printers
CREATE TABLE printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  brand_id UUID NOT NULL REFERENCES printer_brands(id),
  model_id UUID NOT NULL REFERENCES printer_models(id),
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'IDLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dropdown options (admin-managed static lists)
CREATE TABLE dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, label)
);

-- Jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_notes TEXT,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  confirmation_token TEXT UNIQUE,
  confirmed_at TIMESTAMPTZ,
  file_url TEXT,
  filament_type TEXT,
  filament_color TEXT,
  estimated_hours REAL,
  admin_notes TEXT,
  printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_student_email ON jobs(student_email);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_confirmation_token ON jobs(confirmation_token);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_job_id ON notifications(job_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER printers_updated_at
  BEFORE UPDATE ON printers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER dropdown_options_updated_at
  BEFORE UPDATE ON dropdown_options FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropdown_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- ============================================================
-- USERS: only admins can manage; users can read themselves
-- ============================================================
CREATE POLICY "Users can read themselves"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (current_user_role() = 'ADMINISTRATOR');

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (current_user_role() = 'ADMINISTRATOR');

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (current_user_role() = 'ADMINISTRATOR');

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (current_user_role() = 'ADMINISTRATOR');

-- ============================================================
-- PRINTERS: anyone can read; admins/managers can write
-- ============================================================
CREATE POLICY "Anyone can read printers"
  ON printers FOR SELECT
  USING (true);

CREATE POLICY "Managers can insert printers"
  ON printers FOR INSERT
  WITH CHECK (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

CREATE POLICY "Managers can update printers"
  ON printers FOR UPDATE
  USING (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

CREATE POLICY "Managers can delete printers"
  ON printers FOR DELETE
  USING (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

-- Same for printer_brands and printer_models
CREATE POLICY "Anyone can read printer brands"
  ON printer_brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage printer brands"
  ON printer_brands FOR INSERT WITH CHECK (current_user_role() = 'ADMINISTRATOR');
CREATE POLICY "Admins can update printer brands"
  ON printer_brands FOR UPDATE USING (current_user_role() = 'ADMINISTRATOR');
CREATE POLICY "Admins can delete printer brands"
  ON printer_brands FOR DELETE USING (current_user_role() = 'ADMINISTRATOR');

CREATE POLICY "Anyone can read printer models"
  ON printer_models FOR SELECT USING (true);
CREATE POLICY "Admins can manage printer models"
  ON printer_models FOR INSERT WITH CHECK (current_user_role() = 'ADMINISTRATOR');
CREATE POLICY "Admins can update printer models"
  ON printer_models FOR UPDATE USING (current_user_role() = 'ADMINISTRATOR');
CREATE POLICY "Admins can delete printer models"
  ON printer_models FOR DELETE USING (current_user_role() = 'ADMINISTRATOR');

-- ============================================================
-- JOBS: students can insert; anyone can read own by email
--        managers and admins can read/update/delete all
-- ============================================================
CREATE POLICY "Anyone can submit a job"
  ON jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can read own jobs"
  ON jobs FOR SELECT
  USING (student_email = current_setting('request.student_email', true));

CREATE POLICY "Managers can read all jobs"
  ON jobs FOR SELECT
  USING (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

CREATE POLICY "Managers can update jobs"
  ON jobs FOR UPDATE
  USING (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

CREATE POLICY "Managers can delete jobs"
  ON jobs FOR DELETE
  USING (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "Anyone can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Managers can read all notifications"
  ON notifications FOR SELECT
  USING (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

CREATE POLICY "Managers can update notifications"
  ON notifications FOR UPDATE
  USING (current_user_role() IN ('MANAGER', 'ADMINISTRATOR'));

-- ============================================================
-- DROPDOWN OPTIONS
-- ============================================================
CREATE POLICY "Anyone can read dropdown options"
  ON dropdown_options FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage dropdown options"
  ON dropdown_options FOR INSERT
  WITH CHECK (current_user_role() = 'ADMINISTRATOR');

CREATE POLICY "Admins can update dropdown options"
  ON dropdown_options FOR UPDATE
  USING (current_user_role() = 'ADMINISTRATOR');

CREATE POLICY "Admins can delete dropdown options"
  ON dropdown_options FOR DELETE
  USING (current_user_role() = 'ADMINISTRATOR');

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE POLICY "Anyone can read system settings"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update system settings"
  ON system_settings FOR UPDATE
  USING (current_user_role() = 'ADMINISTRATOR');
