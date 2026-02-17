
-- Enums
create type public.app_role as enum ('user', 'premium_user', 'admin');
create type public.deal_status as enum ('active', 'expired', 'coming_soon');
create type public.submission_status as enum ('pending', 'approved', 'rejected');
create type public.discount_type as enum ('percentage', 'fixed', 'free_trial', 'bogo', 'other');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  student_verified boolean not null default false,
  premium_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stores
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  categories text[] default '{}',
  student_discount_available boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.stores enable row level security;
create policy "Stores are publicly readable" on public.stores for select using (true);
create policy "Admins can manage stores" on public.stores for all using (public.has_role(auth.uid(), 'admin'));

-- Deals
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade not null,
  title text not null,
  description text,
  discount_type discount_type not null default 'percentage',
  discount_value text,
  affiliate_link_url text,
  direct_link_url text,
  requires_edu_email boolean not null default false,
  status deal_status not null default 'active',
  sponsored boolean not null default false,
  featured boolean not null default false,
  commission_rate numeric(5,2),
  last_checked_at timestamptz,
  ai_summary text,
  expires_at timestamptz,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.deals enable row level security;
create policy "Active deals are publicly readable" on public.deals for select using (true);
create policy "Admins can manage deals" on public.deals for all using (public.has_role(auth.uid(), 'admin'));

-- Favorites
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  deal_id uuid references public.deals(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);
alter table public.favorites enable row level security;
create policy "Users can view own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can insert own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete own favorites" on public.favorites for delete using (auth.uid() = user_id);

-- Alert subscriptions
create table public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  categories text[] default '{}',
  alert_type text not null default 'email',
  created_at timestamptz not null default now()
);
alter table public.alert_subscriptions enable row level security;
create policy "Users can view own alerts" on public.alert_subscriptions for select using (auth.uid() = user_id);
create policy "Users can manage own alerts" on public.alert_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own alerts" on public.alert_subscriptions for update using (auth.uid() = user_id);
create policy "Users can delete own alerts" on public.alert_subscriptions for delete using (auth.uid() = user_id);

-- Submissions
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  deal_title text,
  deal_url text,
  deal_info text,
  category text,
  submitted_by uuid references auth.users(id) on delete set null,
  status submission_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now()
);
alter table public.submissions enable row level security;
create policy "Users can view own submissions" on public.submissions for select using (auth.uid() = submitted_by);
create policy "Users can insert submissions" on public.submissions for insert with check (auth.uid() = submitted_by);
create policy "Admins can manage submissions" on public.submissions for all using (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger update_deals_updated_at before update on public.deals for each row execute function public.update_updated_at_column();

-- Seed stores
insert into public.stores (name, logo_url, website_url, categories, student_discount_available) values
  ('Adobe', 'https://logo.clearbit.com/adobe.com', 'https://adobe.com', '{"Software"}', true),
  ('Apple', 'https://logo.clearbit.com/apple.com', 'https://apple.com/education', '{"Tech"}', true),
  ('Spotify', 'https://logo.clearbit.com/spotify.com', 'https://spotify.com/student', '{"Subscriptions","Entertainment"}', true),
  ('Amazon Prime', 'https://logo.clearbit.com/amazon.com', 'https://amazon.com/primestudent', '{"Subscriptions"}', true),
  ('Nike', 'https://logo.clearbit.com/nike.com', 'https://nike.com', '{"Clothing"}', true),
  ('GitHub', 'https://logo.clearbit.com/github.com', 'https://education.github.com', '{"Software","Learning"}', true),
  ('Notion', 'https://logo.clearbit.com/notion.so', 'https://notion.so/students', '{"Software"}', true),
  ('Samsung', 'https://logo.clearbit.com/samsung.com', 'https://samsung.com/education', '{"Tech"}', true),
  ('The North Face', 'https://logo.clearbit.com/thenorthface.com', 'https://thenorthface.com', '{"Clothing"}', true),
  ('Coursera', 'https://logo.clearbit.com/coursera.org', 'https://coursera.org', '{"Learning"}', true),
  ('Chegg', 'https://logo.clearbit.com/chegg.com', 'https://chegg.com', '{"Books","Learning"}', true),
  ('ASOS', 'https://logo.clearbit.com/asos.com', 'https://asos.com', '{"Clothing"}', true),
  ('Uber Eats', 'https://logo.clearbit.com/ubereats.com', 'https://ubereats.com', '{"Food"}', true),
  ('Headspace', 'https://logo.clearbit.com/headspace.com', 'https://headspace.com/studentplan', '{"Fitness","Subscriptions"}', true),
  ('Amtrak', 'https://logo.clearbit.com/amtrak.com', 'https://amtrak.com', '{"Travel"}', true);

-- Seed deals (referencing stores by subquery)
insert into public.deals (store_id, title, description, discount_type, discount_value, requires_edu_email, status, sponsored, featured, category, expires_at) values
  ((select id from public.stores where name='Adobe'), '60% Off Creative Cloud', 'Full Creative Cloud suite at student pricing', 'percentage', '60', true, 'active', true, true, 'Software', now() + interval '90 days'),
  ((select id from public.stores where name='Apple'), 'Education Pricing on MacBooks', 'Save up to $300 on Mac with education pricing', 'fixed', '300', true, 'active', false, true, 'Tech', null),
  ((select id from public.stores where name='Spotify'), 'Premium Student Plan $5.99/mo', 'Spotify Premium with Hulu and SHOWTIME', 'fixed', '5.99', true, 'active', true, false, 'Subscriptions', now() + interval '365 days'),
  ((select id from public.stores where name='Amazon Prime'), 'Prime Student 6-Month Free Trial', '6 months free then 50% off Prime', 'free_trial', '6 months', true, 'active', true, true, 'Subscriptions', null),
  ((select id from public.stores where name='Nike'), '10% Off with UNiDAYS', 'Student discount via UNiDAYS verification', 'percentage', '10', false, 'active', false, false, 'Clothing', now() + interval '60 days'),
  ((select id from public.stores where name='GitHub'), 'GitHub Student Developer Pack', 'Free GitHub Pro + tons of developer tools', 'other', 'Free', true, 'active', false, true, 'Software', null),
  ((select id from public.stores where name='Notion'), 'Free Notion Plus Plan', 'Free Plus plan for students and educators', 'other', 'Free', true, 'active', false, false, 'Software', null),
  ((select id from public.stores where name='Samsung'), '15% Off with Student Beans', 'Discount on phones, tablets, and laptops', 'percentage', '15', false, 'active', false, false, 'Tech', now() + interval '30 days'),
  ((select id from public.stores where name='The North Face'), '10% Student Discount', 'Verify via Student Beans for 10% off', 'percentage', '10', false, 'active', false, false, 'Clothing', now() + interval '45 days'),
  ((select id from public.stores where name='Coursera'), 'Coursera Plus at $1/month for 3 months', 'Access 7000+ courses at student rate', 'fixed', '1', true, 'active', false, true, 'Learning', now() + interval '30 days'),
  ((select id from public.stores where name='Chegg'), '4-Week Free Trial', 'Free Chegg Study trial for new students', 'free_trial', '4 weeks', false, 'active', false, false, 'Books', now() + interval '14 days'),
  ((select id from public.stores where name='ASOS'), '10% Off Everything', 'Student discount via UNiDAYS on ASOS', 'percentage', '10', false, 'active', false, false, 'Clothing', now() + interval '60 days'),
  ((select id from public.stores where name='Uber Eats'), '$5 Off First 3 Orders', 'Student exclusive Uber Eats promo', 'fixed', '5', true, 'active', true, false, 'Food', now() + interval '21 days'),
  ((select id from public.stores where name='Headspace'), 'Free Headspace for Students', 'Mindfulness and meditation app free for students', 'other', 'Free', true, 'active', false, false, 'Fitness', null),
  ((select id from public.stores where name='Amtrak'), '15% Off with Student Advantage', 'Discounted train travel across the US', 'percentage', '15', false, 'active', false, false, 'Travel', now() + interval '180 days'),
  ((select id from public.stores where name='Adobe'), '50% Off Acrobat Pro', 'PDF editor at student pricing', 'percentage', '50', true, 'active', false, false, 'Software', now() + interval '60 days'),
  ((select id from public.stores where name='Apple'), 'Free AirPods with Mac Purchase', 'Back to school promo with free AirPods', 'other', 'Free AirPods', true, 'coming_soon', false, true, 'Tech', null),
  ((select id from public.stores where name='Samsung'), 'Galaxy Buds Free with Phone', 'Student exclusive bundle deal', 'other', 'Free Galaxy Buds', false, 'coming_soon', false, false, 'Tech', null),
  ((select id from public.stores where name='Spotify'), 'Duo Student Plan', 'Share Premium with a roommate at student rate', 'fixed', '8.99', true, 'expired', false, false, 'Subscriptions', now() - interval '7 days'),
  ((select id from public.stores where name='Chegg'), 'Writing Tools Free Access', 'Free access to Chegg Writing tools', 'other', 'Free', false, 'expired', false, false, 'Books', now() - interval '14 days');
