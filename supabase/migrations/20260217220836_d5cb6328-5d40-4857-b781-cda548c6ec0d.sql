
-- Add new Phase 2 columns to submissions table
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS deal_type text DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS verification_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_affiliate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS affiliate_network text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expiration_date timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS region text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS redemption_steps text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banner_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screenshot_url text DEFAULT NULL;

-- Create storage bucket for submission media
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-media', 'submission-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload submission media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submission-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for submission media
CREATE POLICY "Submission media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'submission-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own submission media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submission-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage all submission media
CREATE POLICY "Admins can manage submission media"
ON storage.objects FOR ALL
USING (
  bucket_id = 'submission-media'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
