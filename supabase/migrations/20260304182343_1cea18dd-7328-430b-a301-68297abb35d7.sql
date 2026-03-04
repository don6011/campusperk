
-- Add founding member column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false;

-- Create a function that auto-sets founding member on campus verification
-- if the campus has fewer than 1000 verified members
CREATE OR REPLACE FUNCTION public.check_founding_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  verified_count integer;
BEGIN
  -- Only act when campus_verified transitions to true
  IF NEW.campus_verified = true AND (OLD.campus_verified = false OR OLD.campus_verified IS NULL) AND NEW.campus_id IS NOT NULL THEN
    SELECT count(*) INTO verified_count
    FROM public.profiles
    WHERE campus_id = NEW.campus_id
      AND campus_verified = true
      AND id != NEW.id;

    IF verified_count < 1000 THEN
      NEW.is_founding_member := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_check_founding_member ON public.profiles;
CREATE TRIGGER trg_check_founding_member
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_founding_member();
