
-- Create campus_domains table
CREATE TABLE public.campus_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_root text NOT NULL UNIQUE,
  campus_name text,
  verification_confidence integer NOT NULL DEFAULT 50,
  is_approved boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campus_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campus domains are publicly readable"
  ON public.campus_domains FOR SELECT USING (true);

CREATE POLICY "Admins can manage campus domains"
  ON public.campus_domains FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_campus_domains_updated_at
  BEFORE UPDATE ON public.campus_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add verification_strength_score to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_strength_score integer NOT NULL DEFAULT 0;

-- Create a function to normalize/extract root domain from email
CREATE OR REPLACE FUNCTION public.normalize_campus_domain(email_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  domain text;
  parts text[];
BEGIN
  -- Extract domain from email
  domain := lower(split_part(email_address, '@', 2));
  
  -- Split by dots
  parts := string_to_array(domain, '.');
  
  -- Strip common subdomains: student, alumni, mail, my, email, stu, stud, e, m
  IF array_length(parts, 1) > 2 THEN
    IF parts[1] IN ('student', 'students', 'alumni', 'mail', 'my', 'email', 'stu', 'stud', 'e', 'm', 'webmail', 'outlook', 'live', 'connect', 'go', 'g') THEN
      parts := parts[2:array_length(parts, 1)];
    END IF;
  END IF;
  
  RETURN array_to_string(parts, '.');
END;
$$;

-- Function to compute verification strength score
CREATE OR REPLACE FUNCTION public.compute_verification_score(
  p_has_edu boolean DEFAULT false,
  p_domain_approved boolean DEFAULT false,
  p_admin_verified boolean DEFAULT false,
  p_has_proof boolean DEFAULT false
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT
    CASE WHEN p_has_edu THEN 50 ELSE 0 END +
    CASE WHEN p_domain_approved THEN 20 ELSE 0 END +
    CASE WHEN p_admin_verified THEN 30 ELSE 0 END +
    CASE WHEN p_has_proof THEN 20 ELSE 0 END;
$$;

-- Function to auto-create campus domain entry if not exists
CREATE OR REPLACE FUNCTION public.ensure_campus_domain(p_domain_root text, p_campus_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  domain_id uuid;
BEGIN
  SELECT id INTO domain_id FROM public.campus_domains WHERE domain_root = p_domain_root;
  
  IF domain_id IS NULL THEN
    INSERT INTO public.campus_domains (domain_root, campus_name, is_approved, verification_confidence)
    VALUES (
      p_domain_root,
      p_campus_name,
      -- Auto-approve .edu domains
      (p_domain_root LIKE '%.edu'),
      CASE WHEN p_domain_root LIKE '%.edu' THEN 70 ELSE 30 END
    )
    RETURNING id INTO domain_id;
  END IF;
  
  RETURN domain_id;
END;
$$;
