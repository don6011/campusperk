-- Private beta access model: keep public launch closed while allowing approved beta users.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS beta_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta_access_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_access_granted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS beta_access_source text,
  ADD COLUMN IF NOT EXISTS beta_access_notes text;

CREATE INDEX IF NOT EXISTS idx_profiles_beta_access ON public.profiles(beta_access);

CREATE OR REPLACE FUNCTION public.admin_set_beta_access(
  p_user_id uuid,
  p_beta_access boolean,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  UPDATE public.profiles
  SET beta_access = p_beta_access,
      beta_access_granted_at = CASE WHEN p_beta_access THEN now() ELSE NULL END,
      beta_access_granted_by = CASE WHEN p_beta_access THEN v_admin ELSE NULL END,
      beta_access_source = CASE WHEN p_beta_access THEN 'admin' ELSE NULL END,
      beta_access_notes = left(trim(p_reason), 500),
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_beta_access(uuid, boolean, text) TO authenticated;
