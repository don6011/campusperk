
-- =============================================
-- 1) EVOLVE campus_domains → add geo fields
-- =============================================
ALTER TABLE public.campus_domains
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- =============================================
-- 2) campus_locations (multi-campus footprint)
-- =============================================
CREATE TABLE public.campus_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id uuid NOT NULL REFERENCES public.campus_domains(id) ON DELETE CASCADE,
  location_name text NOT NULL DEFAULT 'Main Campus',
  address text,
  city text,
  state text,
  zip text,
  latitude numeric,
  longitude numeric,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campus locations publicly readable"
  ON public.campus_locations FOR SELECT USING (true);

CREATE POLICY "Admins can manage campus locations"
  ON public.campus_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 3) partners table
-- =============================================
CREATE TYPE public.partner_type AS ENUM ('local_business', 'regional_chain', 'national_brand', 'affiliate_network');
CREATE TYPE public.partner_status AS ENUM ('lead', 'active', 'paused');

CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name text NOT NULL,
  partner_type public.partner_type NOT NULL DEFAULT 'local_business',
  website_url text,
  contact_email text,
  logo_url text,
  status public.partner_status NOT NULL DEFAULT 'lead',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners publicly readable"
  ON public.partners FOR SELECT USING (true);

CREATE POLICY "Admins can manage partners"
  ON public.partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4) partner_locations table
-- =============================================
CREATE TABLE public.partner_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  location_name text,
  address text,
  city text,
  state text,
  zip text,
  latitude numeric,
  longitude numeric,
  radius_miles numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner locations publicly readable"
  ON public.partner_locations FOR SELECT USING (true);

CREATE POLICY "Admins can manage partner locations"
  ON public.partner_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5) partner_offers table
-- =============================================
CREATE TYPE public.offer_status AS ENUM ('pending', 'active', 'expired');

CREATE TABLE public.partner_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  offer_title text NOT NULL,
  offer_description text,
  discount_value text,
  deal_type public.discount_type NOT NULL DEFAULT 'percentage',
  requires_campus_verification boolean NOT NULL DEFAULT false,
  eligible_roles public.campus_role[] DEFAULT '{}',
  start_at timestamptz,
  end_at timestamptz,
  redemption_instructions text,
  terms text,
  status public.offer_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active offers publicly readable"
  ON public.partner_offers FOR SELECT USING (true);

CREATE POLICY "Admins can manage partner offers"
  ON public.partner_offers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_partner_offers_updated_at
  BEFORE UPDATE ON public.partner_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6) UPDATE deals table - add partner linkage + geo
-- =============================================
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS geo_radius_miles numeric,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id),
  ADD COLUMN IF NOT EXISTS partner_offer_id uuid REFERENCES public.partner_offers(id);

-- =============================================
-- 7) UPDATE profiles table - add campus + location fields
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES public.campus_domains(id),
  ADD COLUMN IF NOT EXISTS campus_city text,
  ADD COLUMN IF NOT EXISTS campus_state text,
  ADD COLUMN IF NOT EXISTS user_city text,
  ADD COLUMN IF NOT EXISTS user_state text,
  ADD COLUMN IF NOT EXISTS location_opt_in boolean NOT NULL DEFAULT false;
