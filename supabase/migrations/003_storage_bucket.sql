-- Create storage bucket for job file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('job-files', 'job-files', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read/download files from the bucket
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-files');

-- Allow anyone to upload files (students are anon; managers/admins are authenticated)
CREATE POLICY "Public upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'job-files');
