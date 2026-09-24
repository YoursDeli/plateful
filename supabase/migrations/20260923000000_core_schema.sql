-- Plateful — Build Order step 1: core schema
-- Tables: profiles, categories, menu_items, site_settings, reviews
-- Referral/loyalty columns are added in their own migrations (Build Order 9/10).
-- See CLAUDE.md §5 and docs/branding-security-auth.md §3 for the RLS rules.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text check (char_length(full_name) <= 120),
  phone           text check (char_length(phone) <= 30),
  default_address text check (char_length(default_address) <= 500),
  role            text not null default 'customer'
                  check (role in ('customer', 'staff', 'admin')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Staff check used by every staff/admin RLS policy. SECURITY DEFINER so it can
-- read profiles without recursing into profiles' own RLS policies.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('staff', 'admin')
  );
$$;

-- `role` is never writable from a user's own session (anon/authenticated JWT).
-- Only the service role or a direct SQL session (dashboard / migrations) can
-- change it; any other attempt is silently reverted to the old value.
-- Referral/loyalty cached balances get added to this guard in steps 9/10.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated') then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- Creates the profiles row on first sign-in (Email OTP or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: read own or staff reads all"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policies: rows are created by handle_new_user and removed
-- by the auth.users cascade.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(trim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index categories_sort_order_idx on public.categories (sort_order);

alter table public.categories enable row level security;

create policy "categories: public read"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "categories: staff insert"
  on public.categories for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "categories: staff update"
  on public.categories for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "categories: staff delete"
  on public.categories for delete
  to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------

create table public.menu_items (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(trim(name)) between 1 and 120),
  description      text check (char_length(description) <= 1000),
  -- Naira (not kobo). Converted to kobo only at the Paystack boundary.
  price            numeric(12, 2) not null check (price >= 0),
  category_id      uuid references public.categories (id) on delete set null,
  image_url        text,
  is_available     boolean not null default true,
  compare_at_price numeric(12, 2)
                   check (compare_at_price is null or compare_at_price > price),
  badge            text check (badge in ('New', 'Bestseller')),
  -- Cached review aggregates, maintained by the reviews trigger below.
  avg_rating       numeric(3, 2),
  review_count     integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index menu_items_category_id_idx on public.menu_items (category_id);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

alter table public.menu_items enable row level security;

create policy "menu_items: public read"
  on public.menu_items for select
  to anon, authenticated
  using (true);

create policy "menu_items: staff insert"
  on public.menu_items for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "menu_items: staff update"
  on public.menu_items for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "menu_items: staff delete"
  on public.menu_items for delete
  to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- site_settings (singleton, id = 1)
-- ---------------------------------------------------------------------------

create table public.site_settings (
  id            integer primary key default 1 check (id = 1),
  brand_name    text not null default 'Plateful'
                check (char_length(trim(brand_name)) between 1 and 60),
  logo_url      text,
  primary_color text not null default '#D3C5F6'
                check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color  text not null default '#3B2A60'
                check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at    timestamptz not null default now()
);

insert into public.site_settings (id) values (1);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings: public read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings: staff update"
  on public.site_settings for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- No insert/delete policies: the single row is seeded above and never removed.

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 2000),
  created_at   timestamptz not null default now()
);

create index reviews_menu_item_id_idx on public.reviews (menu_item_id);

alter table public.reviews enable row level security;

create policy "reviews: public read"
  on public.reviews for select
  to anon, authenticated
  using (true);

-- Insert/update/delete policies intentionally omitted until the open decision
-- in docs/progress.md is made (purchaser-only vs any signed-in user). With RLS
-- enabled and no write policy, all client-side review writes are denied.

-- Keeps menu_items.avg_rating / review_count in sync. SECURITY DEFINER because
-- the reviewing customer has no update rights on menu_items.
create or replace function public.sync_menu_item_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.menu_items m
       set avg_rating = s.avg_rating, review_count = s.review_count
      from (
        select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as review_count
          from public.reviews
         where menu_item_id = old.menu_item_id
      ) s
     where m.id = old.menu_item_id;
  end if;

  if tg_op = 'INSERT'
     or (tg_op = 'UPDATE' and new.menu_item_id is distinct from old.menu_item_id) then
    update public.menu_items m
       set avg_rating = s.avg_rating, review_count = s.review_count
      from (
        select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as review_count
          from public.reviews
         where menu_item_id = new.menu_item_id
      ) s
     where m.id = new.menu_item_id;
  end if;

  return null;
end;
$$;

create trigger reviews_sync_menu_item_rating
  after insert or update or delete on public.reviews
  for each row execute function public.sync_menu_item_rating();

-- ---------------------------------------------------------------------------
-- Data API privileges
-- ---------------------------------------------------------------------------
-- The project is created with "Automatically expose new tables" OFF, so each
-- table's API access is granted explicitly here (least privilege). RLS
-- policies above still decide which rows each role can see or change —
-- a grant without a matching policy allows nothing.

grant usage on schema public to anon, authenticated, service_role;

-- Public storefront reads.
grant select on public.categories, public.menu_items, public.site_settings, public.reviews
  to anon, authenticated;

-- Staff writes (RLS limits these to is_staff()).
grant insert, update, delete on public.categories, public.menu_items to authenticated;
grant update (brand_name, logo_url, primary_color, accent_color) on public.site_settings
  to authenticated;

-- Customers read/update their own profile. Column-level grant: `role` (and,
-- later, the cached reward balances) isn't even updatable from a user session;
-- the protect_profile_privileged_columns trigger stays as a second guard.
grant select on public.profiles to authenticated;
grant update (full_name, phone, default_address) on public.profiles to authenticated;

-- Used inside RLS policies, so the calling roles must be able to execute it.
grant execute on function public.is_staff() to anon, authenticated;

-- Trusted server contexts (webhook, admin bulk actions). Bypasses RLS.
grant select, insert, update, delete
  on public.profiles, public.categories, public.menu_items, public.site_settings, public.reviews
  to service_role;
