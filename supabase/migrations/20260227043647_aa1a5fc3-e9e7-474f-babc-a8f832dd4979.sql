
-- Create a public bucket for partner logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true);

-- Allow admins to upload partner logos
CREATE POLICY "Admins can upload partner logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update partner logos
CREATE POLICY "Admins can update partner logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete partner logos
CREATE POLICY "Admins can delete partner logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));

-- Allow public read access to partner logos
CREATE POLICY "Partner logos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-logos');
