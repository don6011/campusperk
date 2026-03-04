
CREATE TABLE public.deal_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  campus_id uuid REFERENCES public.campus_domains(id) ON DELETE SET NULL,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert deal clicks" ON public.deal_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own clicks" ON public.deal_clicks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage deal clicks" ON public.deal_clicks FOR ALL USING (public.has_role(auth.uid(), 'admin'));
