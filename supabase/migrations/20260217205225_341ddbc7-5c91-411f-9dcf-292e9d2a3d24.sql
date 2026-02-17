
-- Create verification method enum
CREATE TYPE public.verification_method AS ENUM ('edu', 'manual', 'partner');

-- Create verification audit log table
CREATE TABLE public.verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  previous_status boolean NOT NULL,
  new_status boolean NOT NULL,
  verification_method verification_method NOT NULL DEFAULT 'manual',
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can insert and view audit logs
CREATE POLICY "Admins can manage audit logs"
  ON public.verification_audit_log
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.verification_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to read all profiles for the users management page
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any profile (for toggling student_verified)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
