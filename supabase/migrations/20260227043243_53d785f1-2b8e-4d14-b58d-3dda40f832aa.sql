
-- First create stores for any partners that don't have one
INSERT INTO public.stores (name, logo_url, website_url, student_discount_available)
SELECT DISTINCT p.partner_name, p.logo_url, p.website_url, true
FROM public.partners p
JOIN public.partner_offers po ON po.partner_id = p.id
WHERE po.status = 'active'
  AND po.id NOT IN (SELECT partner_offer_id FROM public.deals WHERE partner_offer_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE lower(s.name) = lower(p.partner_name));

-- Now backfill the deals
INSERT INTO public.deals (
  title, description, discount_type, discount_value, store_id,
  partner_id, partner_offer_id, sponsored, sponsor_tier,
  sponsor_start_at, sponsor_end_at, sponsor_priority, sponsor_source,
  requires_campus_verification, eligible_roles, status, expires_at
)
SELECT
  po.offer_title,
  po.offer_description,
  po.deal_type,
  po.discount_value,
  s.id,
  po.partner_id,
  po.id,
  po.sponsored,
  po.sponsor_tier,
  po.sponsor_start_at,
  po.sponsor_end_at,
  po.sponsor_priority,
  'partner_offer',
  po.requires_campus_verification,
  po.eligible_roles,
  'active'::deal_status,
  po.end_at
FROM public.partner_offers po
JOIN public.partners p ON p.id = po.partner_id
JOIN public.stores s ON lower(s.name) = lower(p.partner_name)
WHERE po.status = 'active'
  AND po.id NOT IN (SELECT partner_offer_id FROM public.deals WHERE partner_offer_id IS NOT NULL);
