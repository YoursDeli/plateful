-- Plateful — customer reviews (docs/menu-and-product-page.md §3)
-- Decisions (client, 2026-09-25):
--   * Only real buyers review: the customer must have an order containing the
--     dish that reached `delivered` (delivery or pickup collected).
--   * Reviews show immediately; staff can hide any review.
--   * One review per customer per dish; submitting again edits it.
-- All writes go through security-definer functions — customers still have no
-- direct insert/update/delete rights on public.reviews.

-- ---------------------------------------------------------------------------
-- Table changes
-- ---------------------------------------------------------------------------
alter table public.reviews
  add column is_hidden  boolean not null default false,
  add column updated_at timestamptz not null default now(),
  add constraint reviews_one_per_customer unique (menu_item_id, user_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Hidden reviews disappear from the public; the author and staff still see them.
drop policy "reviews: public read" on public.reviews;
create policy "reviews: public read"
  on public.reviews for select
  to anon, authenticated
  using (
    not is_hidden
    or user_id = (select auth.uid())
    or (select public.is_staff())
  );

-- ---------------------------------------------------------------------------
-- Cached aggregates: count visible reviews only, and recompute on every
-- change (the original trigger skipped rating edits).
-- ---------------------------------------------------------------------------
create or replace function public.sync_menu_item_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item uuid;
begin
  for v_item in
    select distinct x
      from unnest(array[
        case when tg_op in ('UPDATE', 'DELETE') then old.menu_item_id end,
        case when tg_op in ('INSERT', 'UPDATE') then new.menu_item_id end
      ]) as x
     where x is not null
  loop
    update public.menu_items m
       set avg_rating = s.avg_rating, review_count = s.review_count
      from (
        select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as review_count
          from public.reviews
         where menu_item_id = v_item and not is_hidden
      ) s
     where m.id = v_item;
  end loop;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public list: visible reviews only, reviewer first name only.
-- ---------------------------------------------------------------------------
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
    and not r.is_hidden
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Eligibility: has this customer received this dish?
-- ---------------------------------------------------------------------------
create or replace function public._has_received_item(p_user uuid, p_menu_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where o.user_id = p_user
       and o.status = 'delivered'
       and oi.menu_item_id = p_menu_item_id
  );
$$;

revoke all on function public._has_received_item(uuid, uuid) from public, anon, authenticated;

-- The dish page asks: may I review this, and what did I say last time?
create or replace function public.my_review_status(p_menu_item_id uuid)
returns table (can_review boolean, rating smallint, comment text, is_hidden boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public._has_received_item((select auth.uid()), p_menu_item_id),
    r.rating,
    r.comment,
    r.is_hidden
  from (select 1) as one
  left join public.reviews r
    on r.menu_item_id = p_menu_item_id
   and r.user_id = (select auth.uid());
$$;

revoke all on function public.my_review_status(uuid) from public, anon;
grant execute on function public.my_review_status(uuid) to authenticated;

-- Create or edit the caller's review. Editing keeps any staff "hidden" flag.
create or replace function public.submit_review(
  p_menu_item_id uuid,
  p_rating integer,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if v_user is null then
    raise exception 'Sign in to leave a review.' using errcode = '42501';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5 stars.' using errcode = '22023';
  end if;
  if char_length(v_comment) > 1000 then
    raise exception 'Keep your review under 1,000 characters.' using errcode = '22023';
  end if;
  if not public._has_received_item(v_user, p_menu_item_id) then
    raise exception 'You can review a dish once an order with it has been delivered to you.'
      using errcode = '42501';
  end if;

  insert into public.reviews (menu_item_id, user_id, rating, comment)
  values (p_menu_item_id, v_user, p_rating, v_comment)
  on conflict (menu_item_id, user_id)
  do update set rating = excluded.rating, comment = excluded.comment;
end;
$$;

revoke all on function public.submit_review(uuid, integer, text) from public, anon;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Staff moderation
-- ---------------------------------------------------------------------------
create or replace function public.admin_reviews(p_limit integer default 100)
returns table (
  id            uuid,
  menu_item_id  uuid,
  dish_name     text,
  reviewer_name text,
  rating        smallint,
  comment       text,
  is_hidden     boolean,
  created_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  return query
    select r.id, r.menu_item_id, m.name, coalesce(nullif(trim(p.full_name), ''), 'Customer'),
           r.rating, r.comment, r.is_hidden, r.created_at
      from public.reviews r
      join public.menu_items m on m.id = r.menu_item_id
      join public.profiles p on p.id = r.user_id
     order by r.created_at desc
     limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

revoke all on function public.admin_reviews(integer) from public, anon;
grant execute on function public.admin_reviews(integer) to authenticated;

create or replace function public.set_review_hidden(p_review_id uuid, p_hidden boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  update public.reviews set is_hidden = p_hidden where id = p_review_id
  returning menu_item_id into v_item;
  return v_item; -- so the caller can refresh that dish's page
end;
$$;

revoke all on function public.set_review_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_review_hidden(uuid, boolean) to authenticated;
