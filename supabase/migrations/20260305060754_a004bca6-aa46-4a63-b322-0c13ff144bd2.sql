
CREATE OR REPLACE FUNCTION public.get_deal_redirect(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec deals%ROWTYPE;
  is_premium boolean;
  store_name text;
  store_logo text;
BEGIN
  SELECT * INTO rec FROM deals WHERE id = p_deal_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Get store info
  SELECT s.name, s.logo_url INTO store_name, store_logo
  FROM stores s WHERE s.id = rec.store_id;

  -- Check premium status
  SELECT p.premium_status INTO is_premium
  FROM profiles p WHERE p.id = auth.uid();

  -- If premium-gated and user is not premium, mask URLs
  IF (rec.visibility = 'premium' OR rec.premium_only = true) AND NOT coalesce(is_premium, false) THEN
    RETURN jsonb_build_object(
      'id', rec.id,
      'title', rec.title,
      'status', rec.status,
      'visibility', rec.visibility,
      'sponsored', rec.sponsored,
      'deal_scope', rec.deal_scope,
      'blocked_reason', 'premium_gated',
      'store_name', store_name,
      'store_logo', store_logo
    );
  END IF;

  -- If expired, block
  IF rec.status = 'expired' THEN
    RETURN jsonb_build_object(
      'id', rec.id,
      'title', rec.title,
      'status', rec.status,
      'visibility', rec.visibility,
      'sponsored', rec.sponsored,
      'deal_scope', rec.deal_scope,
      'blocked_reason', 'expired',
      'store_name', store_name,
      'store_logo', store_logo
    );
  END IF;

  -- Return full data including URLs
  RETURN jsonb_build_object(
    'id', rec.id,
    'title', rec.title,
    'status', rec.status,
    'visibility', rec.visibility,
    'sponsored', rec.sponsored,
    'deal_scope', rec.deal_scope,
    'affiliate_link_url', rec.affiliate_link_url,
    'direct_link_url', rec.direct_link_url,
    'store_name', store_name,
    'store_logo', store_logo
  );
END;
$$;
