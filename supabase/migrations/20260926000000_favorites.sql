-- Plateful — Build Order step 4: favorites
-- One row per (user, dish). Customers can only see/add/remove their own.

create table public.favorites (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, menu_item_id)
);

create index favorites_menu_item_id_idx on public.favorites (menu_item_id);

alter table public.favorites enable row level security;

create policy "favorites: read own"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: add own"
  on public.favorites for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "favorites: remove own"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Explicit Data API grants (project has "Automatically expose new tables" off).
-- No update grant: a favorite is only ever added or removed.
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.favorites to service_role;
