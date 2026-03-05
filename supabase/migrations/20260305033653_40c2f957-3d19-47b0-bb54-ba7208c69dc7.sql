
-- Add premium_only and early_access_minutes to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS premium_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS early_access_minutes integer NOT NULL DEFAULT 0;

-- Group deals table
CREATE TABLE public.group_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  required_participants integer NOT NULL DEFAULT 50,
  current_participants integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  campus_id uuid REFERENCES public.campus_domains(id),
  status text NOT NULL DEFAULT 'active',
  expires_at timestamp with time zone NOT NULL,
  unlocked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group deals publicly readable" ON public.group_deals FOR SELECT USING (true);
CREATE POLICY "Premium users can create group deals" ON public.group_deals FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can manage group deals" ON public.group_deals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Creators can update own group deals" ON public.group_deals FOR UPDATE USING (auth.uid() = created_by);

-- Group deal participants
CREATE TABLE public.group_deal_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_deal_id uuid REFERENCES public.group_deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_deal_id, user_id)
);

ALTER TABLE public.group_deal_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants publicly readable" ON public.group_deal_participants FOR SELECT USING (true);
CREATE POLICY "Users can join group deals" ON public.group_deal_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave group deals" ON public.group_deal_participants FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage participants" ON public.group_deal_participants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
