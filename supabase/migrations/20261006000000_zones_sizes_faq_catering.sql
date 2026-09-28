-- Plateful — client additions (2026-09-28):
--   1) Delivery areas with their own prices (replace the single flat fee).
--      The free-delivery threshold still applies to every area (client).
--   2) Bowl sizes: one shared list of sizes; each dish sets a price per size
--      it comes in (client). Dishes with no size prices keep one price.
--   3) FAQ entries (footer page + checkout).
--   4) Catering / event quote requests — signed-in customers only (client).
-- create_order() gains the delivery area and per-line bowl size.

-- ===========================================================================
-- 1) Delivery areas
-- ===========================================================================
create table public.delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(trim(name)) between 1 and 80),
  fee        numeric(12, 2) not null check (fee >= 0 and fee <= 1000000),
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger delivery_zones_set_updated_at
  before update on public.delivery_zones
  for each row execute function public.set_updated_at();

alter table public.delivery_zones enable row level security;

create policy "delivery_zones: public read active"
  on public.delivery_zones for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "delivery_zones: staff insert"
  on public.delivery_zones for insert to authenticated
  with check ((select public.is_staff()));
create policy "delivery_zones: staff update"
  on public.delivery_zones for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "delivery_zones: staff delete"
  on public.delivery_zones for delete to authenticated
  using ((select public.is_staff()));

grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;
grant select, insert, update, delete on public.delivery_zones to service_role;

insert into public.delivery_zones (name, fee, sort_order) values
  ('Uvwie', 2000, 0),
  ('Udu', 4000, 1),
  ('Warri South', 3000, 2),
  ('Outside Warri', 5000, 3);

-- The area name is copied onto the order (areas can be renamed later).
alter table public.orders
  add column delivery_zone text check (char_length(delivery_zone) <= 80);

-- ===========================================================================
-- 2) Bowl sizes
-- ===========================================================================
create table public.bowl_sizes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(trim(name)) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.menu_item_sizes (
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  size_id      uuid not null references public.bowl_sizes (id) on delete cascade,
  price        numeric(12, 2) not null check (price > 0 and price <= 10000000),
  primary key (menu_item_id, size_id)
);

create index menu_item_sizes_size_id_idx on public.menu_item_sizes (size_id);

alter table public.bowl_sizes enable row level security;
alter table public.menu_item_sizes enable row level security;

create policy "bowl_sizes: public read"
  on public.bowl_sizes for select to anon, authenticated using (true);
create policy "bowl_sizes: staff insert"
  on public.bowl_sizes for insert to authenticated with check ((select public.is_staff()));
create policy "bowl_sizes: staff update"
  on public.bowl_sizes for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "bowl_sizes: staff delete"
  on public.bowl_sizes for delete to authenticated using ((select public.is_staff()));

create policy "menu_item_sizes: public read"
  on public.menu_item_sizes for select to anon, authenticated using (true);
create policy "menu_item_sizes: staff insert"
  on public.menu_item_sizes for insert to authenticated with check ((select public.is_staff()));
create policy "menu_item_sizes: staff update"
  on public.menu_item_sizes for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "menu_item_sizes: staff delete"
  on public.menu_item_sizes for delete to authenticated using ((select public.is_staff()));

grant select on public.bowl_sizes, public.menu_item_sizes to anon, authenticated;
grant insert, update, delete on public.bowl_sizes, public.menu_item_sizes to authenticated;
grant select, insert, update, delete on public.bowl_sizes, public.menu_item_sizes to service_role;

-- Replaces a dish's size prices in one go (admin dish form). Runs as the
-- caller, so the staff-only RLS policies above still apply.
create or replace function public.set_menu_item_sizes(p_menu_item_id uuid, p_prices jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_prices) is distinct from 'array' then
    raise exception 'invalid_prices' using errcode = '22023';
  end if;
  delete from public.menu_item_sizes where menu_item_id = p_menu_item_id;
  insert into public.menu_item_sizes (menu_item_id, size_id, price)
  select p_menu_item_id, (e ->> 'size_id')::uuid, (e ->> 'price')::numeric
    from jsonb_array_elements(p_prices) e;
end;
$$;

revoke all on function public.set_menu_item_sizes(uuid, jsonb) from public, anon;
grant execute on function public.set_menu_item_sizes(uuid, jsonb) to authenticated;

-- Order lines remember the size (id for "Buy again", name as a snapshot).
alter table public.order_items
  add column size_id   uuid references public.bowl_sizes (id) on delete set null,
  add column size_name text check (char_length(size_name) <= 40);

-- ===========================================================================
-- create_order(): + p_delivery_zone_id, + per-line size_id
-- ===========================================================================
drop function if exists public.create_order(jsonb, text, text, text, text, text, boolean, boolean);

create function public.create_order(
  p_items            jsonb,
  p_fulfillment      text,
  p_contact_name     text,
  p_contact_phone    text,
  p_delivery_address text,
  p_notes            text,
  p_apply_referral   boolean default false,
  p_apply_loyalty    boolean default false,
  p_delivery_zone_id uuid default null
)
returns table (
  order_id uuid, order_code text, total numeric, paystack_reference text,
  contact_email text, status text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user     uuid := auth.uid();
  v_email    text;
  v_settings public.site_settings;
  v_profile  public.profiles;
  v_zone     public.delivery_zones;
  v_ids      uuid[];
  v_sizes    uuid[];
  v_qtys     integer[];
  v_bad      integer;
  v_subtotal numeric(12, 2);
  v_fee      numeric(12, 2) := 0;
  v_bonus    numeric(12, 2) := 0;
  v_points   integer := 0;
  v_total    numeric(12, 2);
  v_order    public.orders;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_fulfillment not in ('delivery', 'pickup') then
    raise exception 'invalid_fulfillment' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 100 then
    raise exception 'invalid_cart' using errcode = '22023';
  end if;

  -- Release bonus/points locked in abandoned checkouts before spending any.
  perform public.expire_stale_orders();

  -- One line per dish + size.
  select array_agg(s.menu_item_id), array_agg(s.size_id), array_agg(s.quantity)
    into v_ids, v_sizes, v_qtys
    from (
      select (e ->> 'menu_item_id')::uuid as menu_item_id,
             nullif(e ->> 'size_id', '')::uuid as size_id,
             sum((e ->> 'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_items) e
       group by 1, 2
    ) s;

  -- Every line: dish exists and is available; a dish with size prices needs
  -- one of ITS sizes; a dish without size prices takes no size.
  select count(*) into v_bad
    from unnest(v_ids, v_sizes, v_qtys) as r(menu_item_id, size_id, quantity)
    left join public.menu_items m on m.id = r.menu_item_id
    left join public.menu_item_sizes ms
      on ms.menu_item_id = r.menu_item_id and ms.size_id = r.size_id
   where m.id is null
      or not m.is_available
      or r.quantity < 1 or r.quantity > 50
      or (r.size_id is not null and ms.size_id is null)
      or (r.size_id is null and exists (
            select 1 from public.menu_item_sizes x where x.menu_item_id = r.menu_item_id));
  if v_bad > 0 then
    raise exception 'items_unavailable' using errcode = 'P0001';
  end if;

  select sum(coalesce(ms.price, m.price) * r.quantity) into v_subtotal
    from unnest(v_ids, v_sizes, v_qtys) as r(menu_item_id, size_id, quantity)
    join public.menu_items m on m.id = r.menu_item_id
    left join public.menu_item_sizes ms
      on ms.menu_item_id = r.menu_item_id and ms.size_id = r.size_id;

  select * into v_settings from public.site_settings where id = 1;
  if p_fulfillment = 'delivery' then
    select * into v_zone from public.delivery_zones z
     where z.id = p_delivery_zone_id and z.is_active;
    if not found then
      raise exception 'invalid_delivery_zone' using errcode = '22023';
    end if;
    -- Free-delivery threshold still applies to every area (client).
    if not (v_settings.free_delivery_threshold is not null
            and v_subtotal >= v_settings.free_delivery_threshold) then
      v_fee := v_zone.fee;
    end if;
  end if;

  -- Rewards are re-checked here, never trusted from the client. Row lock
  -- prevents double-spending across parallel checkouts.
  if p_apply_referral or p_apply_loyalty then
    select * into v_profile from public.profiles p where p.id = v_user for update;
  end if;
  -- 1) Referral bonus, capped at the food subtotal.
  if p_apply_referral then
    v_bonus := greatest(0, least(coalesce(v_profile.referral_balance, 0), v_subtotal));
  end if;
  -- 2) Loyalty points (₦1 each), capped at what's left of the subtotal.
  if p_apply_loyalty and v_settings.loyalty_enabled then
    v_points := greatest(0, least(coalesce(v_profile.loyalty_points_balance, 0), floor(v_subtotal - v_bonus)::integer));
  end if;

  v_total := v_subtotal - v_bonus - v_points + v_fee;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.orders (
    user_id, fulfillment, contact_name, contact_phone, contact_email,
    delivery_address, delivery_zone, notes, subtotal, delivery_fee,
    referral_bonus_applied, loyalty_points_redeemed, total, paystack_reference,
    status, paid_at
  ) values (
    v_user, p_fulfillment, trim(p_contact_name), trim(p_contact_phone), v_email,
    case when p_fulfillment = 'delivery' then nullif(trim(p_delivery_address), '') end,
    case when p_fulfillment = 'delivery' then v_zone.name end,
    nullif(trim(p_notes), ''),
    v_subtotal, v_fee, v_bonus, v_points, v_total,
    -- Nothing to charge → no Paystack call at all (accounts doc §2 step 3).
    case when v_total = 0 then null else public.new_payment_reference() end,
    case when v_total = 0 then 'paid' else 'pending_payment' end,
    case when v_total = 0 then now() end
  )
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, name, unit_price, quantity, size_id, size_name)
  select v_order.id, m.id, m.name, coalesce(ms.price, m.price), r.quantity, r.size_id, b.name
    from unnest(v_ids, v_sizes, v_qtys) as r(menu_item_id, size_id, quantity)
    join public.menu_items m on m.id = r.menu_item_id
    left join public.menu_item_sizes ms
      on ms.menu_item_id = r.menu_item_id and ms.size_id = r.size_id
    left join public.bowl_sizes b on b.id = r.size_id;

  if v_bonus > 0 then
    insert into public.referral_ledger (user_id, amount, reason, reference_id)
    values (v_user, -v_bonus, 'checkout_redemption', v_order.id);
    update public.profiles p set referral_balance = p.referral_balance - v_bonus where p.id = v_user;
  end if;
  if v_points > 0 then
    insert into public.loyalty_ledger (user_id, points, reason, reference_id)
    values (v_user, -v_points, 'checkout_redemption', v_order.id);
    update public.profiles p set loyalty_points_balance = p.loyalty_points_balance - v_points where p.id = v_user;
  end if;

  insert into public.order_status_history (order_id, status, changed_by)
  values (v_order.id, 'pending_payment', v_user);
  if v_order.status = 'paid' then
    insert into public.order_status_history (order_id, status, changed_by)
    values (v_order.id, 'paid', v_user);
  end if;

  return query
    select v_order.id, v_order.order_code, v_order.total, v_order.paystack_reference,
           v_order.contact_email, v_order.status;
end;
$$;

revoke all on function public.create_order(jsonb, text, text, text, text, text, boolean, boolean, uuid) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text, text, text, boolean, boolean, uuid) to authenticated;

-- ===========================================================================
-- 3) FAQ
-- ===========================================================================
create table public.faqs (
  id               uuid primary key default gen_random_uuid(),
  question         text not null check (char_length(trim(question)) between 1 and 300),
  answer           text not null check (char_length(trim(answer)) between 1 and 3000),
  sort_order       integer not null default 0,
  show_on_checkout boolean not null default true,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

alter table public.faqs enable row level security;

create policy "faqs: public read published"
  on public.faqs for select to anon, authenticated
  using (is_published or (select public.is_staff()));
create policy "faqs: staff insert"
  on public.faqs for insert to authenticated with check ((select public.is_staff()));
create policy "faqs: staff update"
  on public.faqs for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "faqs: staff delete"
  on public.faqs for delete to authenticated using ((select public.is_staff()));

grant select on public.faqs to anon, authenticated;
grant insert, update, delete on public.faqs to authenticated;
grant select, insert, update, delete on public.faqs to service_role;

-- Starter answers ({brand} = business name at render). Edit in Admin → FAQ.
insert into public.faqs (question, answer, sort_order, show_on_checkout) values
('How do I place an order?',
 'Browse the Food Menu, choose a bowl size where a dish offers one, add what you like to your cart and check out. You''ll sign in with a one-time code sent to your email (or with Google) so you can track your order.',
 0, false),
('Where do you deliver, and how much is delivery?',
 'We deliver to Uvwie, Udu, Warri South and areas outside Warri. Pick your area at checkout to see its delivery price. Orders above the free-delivery amount shown at checkout are delivered free.',
 1, true),
('Can I pick up my order instead?',
 'Yes. Choose Pickup at checkout and there''s no delivery fee. We''ll update your order page when it''s ready to collect.',
 2, true),
('What bowl sizes do you have?',
 'Many dishes come in more than one bowl size. Choose your size on the dish before adding it to your cart — the price updates to match.',
 3, true),
('How do I pay?',
 'You pay securely online at checkout through our payment processor (card, bank transfer and other options). We never see or store your card details.',
 4, true),
('Can I cancel my order?',
 'You can cancel a paid order within 30 minutes of payment, as long as we haven''t started preparing it, using "Cancel order" on your order page. After that, orders can''t be cancelled or refunded. See our Terms & Conditions for details.',
 5, true),
('How do I track my order?',
 'Open Orders in your account to see each order''s live progress, from paid to preparing to on its way or ready for pickup.',
 6, false),
('I have an allergy. Can you help?',
 'Please tell us in the order notes. We take care in our kitchen, but we can''t guarantee that any dish is completely free from allergens.',
 7, true),
('Do you cook for events?',
 'Yes. We cater for weddings, birthdays, corporate events and more. Fill in the Events & Catering form and we''ll get back to you with a quote.',
 8, false),
('What are loyalty points and referral bonuses?',
 'You earn loyalty points on delivered orders — each point is ₦1 off a future order. Invite friends with your referral link and earn a bonus when their first order is delivered. You can use both at checkout.',
 9, false);

-- ===========================================================================
-- 4) Catering / event quote requests
-- ===========================================================================
create table public.catering_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  contact_name  text not null check (char_length(trim(contact_name)) between 1 and 120),
  contact_phone text not null check (char_length(trim(contact_phone)) between 7 and 30),
  contact_email text not null,
  event_type    text not null check (event_type in (
                  'Wedding', 'Birthday', 'Corporate event', 'Religious event',
                  'Funeral / remembrance', 'Family gathering', 'Other')),
  event_date    date not null,
  guest_count   integer not null check (guest_count between 1 and 10000),
  food_types    text[] not null default '{}',
  venue         text check (char_length(venue) <= 300),
  budget        text check (char_length(budget) <= 120),
  notes         text check (char_length(notes) <= 2000),
  status        text not null default 'new'
                check (status in ('new', 'contacted', 'quoted', 'booked', 'declined')),
  staff_notes   text check (char_length(staff_notes) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index catering_requests_user_id_idx on public.catering_requests (user_id);
create index catering_requests_created_at_idx on public.catering_requests (created_at desc);

create trigger catering_requests_set_updated_at
  before update on public.catering_requests
  for each row execute function public.set_updated_at();

alter table public.catering_requests enable row level security;

-- Customers see their own requests; staff see and update all. Inserts only
-- through submit_catering_request() below.
create policy "catering_requests: own or staff read"
  on public.catering_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "catering_requests: staff update"
  on public.catering_requests for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

grant select on public.catering_requests to authenticated;
grant update (status, staff_notes) on public.catering_requests to authenticated;
grant select, insert, update, delete on public.catering_requests to service_role;

create or replace function public.submit_catering_request(
  p_contact_name  text,
  p_contact_phone text,
  p_event_type    text,
  p_event_date    date,
  p_guest_count   integer,
  p_food_types    text[],
  p_venue         text,
  p_budget        text,
  p_notes         text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_id    uuid;
begin
  if v_user is null then
    raise exception 'Please sign in to request a quote.' using errcode = '42501';
  end if;
  if p_event_date is null or p_event_date < v_today then
    raise exception 'Choose an event date from today onwards.' using errcode = '22023';
  end if;
  if p_event_date > v_today + interval '2 years' then
    raise exception 'Choose an event date within the next two years.' using errcode = '22023';
  end if;
  if not (coalesce(p_food_types, '{}') <@ array[
      'Soups & swallow', 'Rice dishes', 'Pasta', 'Proteins', 'Small chops', 'Drinks', 'Other']) then
    raise exception 'Unknown food type.' using errcode = '22023';
  end if;
  -- Spam guard: a handful of requests per customer per day is plenty.
  if (select count(*) from public.catering_requests c
       where c.user_id = v_user and c.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'You''ve sent several requests today. We''ll be in touch — or message us directly.'
      using errcode = '22023';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.catering_requests (
    user_id, contact_name, contact_phone, contact_email, event_type, event_date,
    guest_count, food_types, venue, budget, notes
  ) values (
    v_user, trim(p_contact_name), trim(p_contact_phone), v_email, p_event_type, p_event_date,
    p_guest_count, coalesce(p_food_types, '{}'),
    nullif(trim(p_venue), ''), nullif(trim(p_budget), ''), nullif(trim(p_notes), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_catering_request(text, text, text, date, integer, text[], text, text, text) from public, anon;
grant execute on function public.submit_catering_request(text, text, text, date, integer, text[], text, text, text) to authenticated;
