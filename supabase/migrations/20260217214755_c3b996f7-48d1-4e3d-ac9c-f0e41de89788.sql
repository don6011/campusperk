
-- Create categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon_url text,
  sponsored boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Categories are publicly readable"
  ON public.categories FOR SELECT USING (true);

-- Admin manage
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default categories
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Clothing', 'clothing', 'Student savings on apparel & footwear', 1),
  ('Software', 'software', 'Discounts on creative & productivity tools', 2),
  ('Tech & Computers', 'tech', 'Deals on laptops, accessories & gadgets', 3),
  ('Subscriptions', 'subscriptions', 'Streaming, music & service discounts', 4),
  ('Travel', 'travel', 'Student travel deals & hotel discounts', 5),
  ('Food', 'food', 'Restaurant & delivery savings', 6),
  ('Books & Learning', 'learning', 'Textbooks, courses & educational tools', 7),
  ('Fitness', 'fitness', 'Gym memberships & workout gear', 8),
  ('Entertainment', 'entertainment', 'Movies, games & event discounts', 9);

-- Storage bucket for category icons
INSERT INTO storage.buckets (id, name, public) VALUES ('category-icons', 'category-icons', true);

-- Public read for icons
CREATE POLICY "Category icons are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-icons');

-- Admin upload icons
CREATE POLICY "Admins can upload category icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'category-icons' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin update icons
CREATE POLICY "Admins can update category icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'category-icons' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin delete icons
CREATE POLICY "Admins can delete category icons"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'category-icons' AND has_role(auth.uid(), 'admin'::app_role));
