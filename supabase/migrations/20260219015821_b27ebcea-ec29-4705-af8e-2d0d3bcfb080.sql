
-- ============================================================
-- CampusPerk: Campus Role Verification System
-- ============================================================

-- 1. Enums
CREATE TYPE public.campus_role AS ENUM ('student', 'faculty', 'staff', 'alumni');
CREATE TYPE public.campus_role_status AS ENUM ('unselected', 'pending', 'verified', 'rejected');
CREATE TYPE public.campus_verification_method AS ENUM ('edu_email', 'manual_admin', 'partner_provider');
CREATE TYPE public.deal_scope AS ENUM ('national', 'regional', 'local');
CREATE TYPE public.verification_action_type AS ENUM (
  'role_selected',
  'verification_requested',
  'verification_approved',
  'verification_rejected',
  'verification_revoked'
);

-- 2. Update profiles table with campus role fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS campus_role public.campus_role DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS campus_role_status public.campus_role_status NOT NULL DEFAULT 'unselected',
  ADD COLUMN IF NOT EXISTS campus_verification_method public.campus_verification_method DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS campus_domain text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS campus_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS campus_verified boolean NOT NULL DEFAULT false;

-- 3. Create verification_requests table
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campus_role_requested public.campus_role NOT NULL,
  email_domain text NOT NULL,
  proof_upload_urls text[] DEFAULT '{}',
  user_message text DEFAULT NULL,
  status public.campus_role_status NOT NULL DEFAULT 'pending',
  admin_id uuid DEFAULT NULL,
  admin_decision_reason text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone DEFAULT NULL
);

-- Enable RLS on verification_requests
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can insert/view own requests
CREATE POLICY "Users can insert own verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage verification requests"
  ON public.verification_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Extend verification_audit_log with new action type columns
--    (keep existing columns, add new ones for campus role)
ALTER TABLE public.verification_audit_log
  ADD COLUMN IF NOT EXISTS action_type public.verification_action_type DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_role public.campus_role DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS new_role public.campus_role DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_campus_status public.campus_role_status DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS new_campus_status public.campus_role_status DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS campus_verification_method public.campus_verification_method DEFAULT NULL;

-- 5. Add deal eligibility + scoping fields to deals table
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS eligible_roles public.campus_role[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS requires_campus_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_role_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_scope public.deal_scope NOT NULL DEFAULT 'national',
  ADD COLUMN IF NOT EXISTS eligible_campuses text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eligible_regions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eligible_cities text[] DEFAULT '{}';

-- 6. Create storage bucket for verification proof uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-proofs', 'verification-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for verification-proofs bucket: user can upload to their own folder
CREATE POLICY "Users can upload own verification proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own verification proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all verification proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-proofs'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 7. Rate-limit function for verification requests
CREATE OR REPLACE FUNCTION public.check_verification_request_rate_limit(
  p_user_id uuid,
  p_max_requests integer DEFAULT 3,
  p_window_hours integer DEFAULT 24
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) >= p_max_requests
  FROM public.verification_requests
  WHERE user_id = p_user_id
    AND created_at > now() - (p_window_hours || ' hours')::interval;
$$;
