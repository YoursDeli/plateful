-- Plateful — Build Order step 2: storefront support
-- 1. Hero curation: admin picks featured dishes + their order
--    (docs/hero-section-design.md §3 — manual curation first).
-- 2. Public reviews read that exposes only the reviewer's first name
--    (profiles stay private under RLS; docs/menu-and-product-page.md §2).

alter table public.menu_items
  add column featured_order smallint
    check (featured_order is null or featured_order between 1 and 99);

comment on column public.menu_items.featured_order is
  'Hero position (1 = first). NULL = not featured in the hero.';

create index menu_items_featured_order_idx
  on public.menu_items (featured_order)
  where featured_order is not null;

-- Existing table-level grants on menu_items already cover the new column.

create or replace function public.menu_item_reviews(
  p_menu_item_id uuid,
  p_limit integer default 20
)
returns table (
  id            uuid,
  rating        smallint,
  comment       text,
  created_at    timestamptz,
  reviewer_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.rating,
    r.comment,
    r.created_at,
    coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Customer') as reviewer_name
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  where r.menu_item_id = p_menu_item_id
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.menu_item_reviews(uuid, integer) from public;
grant execute on function public.menu_item_reviews(uuid, integer) to anon, authenticated;
