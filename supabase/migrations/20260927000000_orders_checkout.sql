-- Plateful — Build Order step 6: orders, checkout, payment settlement
-- docs/cart-checkout-payment-workflow.md §3–§6, docs/branding-security-auth.md §3.
--
-- Security model:
--   * Nobody writes orders directly — no insert/update/delete grants.
--   * create_order() (callable by signed-in users) re-prices every line from
--     menu_items inside one transaction, so a tampered cart can't pay less.
--   * mark_order_paid() is callable ONLY by the service role (server code,
--     after verifying the payment with Paystack), and is idempotent.
-- Referral/loyalty redemption columns + logic join create_order in steps 9/10.

-- ---------------------------------------------------------------------------
-- Delivery pricing (admin-editable, /admin/settings)
-- ---------------------------------------------------------------------------

alter table public.site_settings
  add column delivery_fee numeric(12, 2) not null default 1500
    check (delivery_fee >= 0),
  add column free_delivery_threshold numeric(12, 2) default 15000
    check (free_delivery_threshold is null or free_delivery_threshold > 0);

update public.site_settings set free_delivery_threshold = 15000 where id = 1;

grant update (delivery_fee, free_delivery_threshold) on public.site_settings to authenticated;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       bigint generated always as identity (start with 1001) unique,
  user_id            uuid not null references public.profiles (id),
  status             text not null default 'pending_payment'
                     check (status in ('pending_payment', 'paid', 'preparing', 'ready',
                                       'out_for_delivery', 'delivered', 'cancelled', 'failed')),
  fulfillment        text not null check (fulfillment in ('delivery', 'pickup')),
  contact_name       text not null check (char_length(trim(contact_name)) between 1 and 120),
  contact_phone      text not null check (char_length(trim(contact_phone)) between 7 and 30),
  contact_email      text not null,
  delivery_address   text check (char_length(delivery_address) <= 500),
  notes              text check (char_length(notes) <= 500),
  subtotal           numeric(12, 2) not null check (subtotal >= 0),
  delivery_fee       numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total              numeric(12, 2) not null check (total >= 0),
  paystack_reference text unique,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint orders_delivery_needs_address check (
    fulfillment = 'pickup' or char_length(trim(coalesce(delivery_address, ''))) >= 5
  )
);

create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Snapshot of each line at purchase time: history survives later menu edits
-- or deletions (menu_item_id is then set null, name/price stay).
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name         text not null,
  unit_price   numeric(12, 2) not null check (unit_price >= 0),
  quantity     integer not null check (quantity between 1 and 50),
  line_total   numeric(12, 2) generated always as (unit_price * quantity) stored
);

create index order_items_order_id_idx on public.order_items (order_id);

-- One row per status change → per-step timestamps on the tracking timeline
-- (docs/ui-components-and-styling.md §1).
create table public.order_status_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index order_status_history_order_id_idx on public.order_status_history (order_id, changed_at);

-- ---------------------------------------------------------------------------
-- RLS: customers read their own orders; staff read all. No client writes.
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy "orders: read own or staff"
  on public.orders for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "order_items: read via own order or staff"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = (select auth.uid()) or (select public.is_staff()))
  ));

create policy "order_status_history: read via own order or staff"
  on public.order_status_history for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = (select auth.uid()) or (select public.is_staff()))
  ));

grant select on public.orders, public.order_items, public.order_status_history to authenticated;
grant select, insert, update, delete
  on public.orders, public.order_items, public.order_status_history to service_role;

-- ---------------------------------------------------------------------------
-- create_order(): authoritative pricing, one transaction
-- ---------------------------------------------------------------------------

create or replace function public.new_payment_reference()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
$$;

create or replace function public.create_order(
  p_items            jsonb,   -- [{ "menu_item_id": "<uuid>", "quantity": 2 }, ...]
  p_fulfillment      text,
  p_contact_name     text,
  p_contact_phone    text,
  p_delivery_address text,
  p_notes            text
)
returns table (order_id uuid, order_number bigint, total numeric, paystack_reference text, contact_email text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user     uuid := auth.uid();
  v_email    text;
  v_settings public.site_settings;
  v_ids      uuid[];
  v_qtys     integer[];
  v_bad      integer;
  v_subtotal numeric(12, 2);
  v_fee      numeric(12, 2) := 0;
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

  -- Requested lines, de-duplicated by dish (quantities summed).
  select array_agg(s.menu_item_id), array_agg(s.quantity)
    into v_ids, v_qtys
    from (
      select (e ->> 'menu_item_id')::uuid as menu_item_id,
             sum((e ->> 'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_items) e
       group by 1
    ) s;

  -- Every dish must exist, be available, and have a sane quantity.
  select count(*) into v_bad
    from unnest(v_ids, v_qtys) as r(menu_item_id, quantity)
    left join public.menu_items m on m.id = r.menu_item_id
   where m.id is null or not m.is_available or r.quantity < 1 or r.quantity > 50;
  if v_bad > 0 then
    raise exception 'items_unavailable' using errcode = 'P0001';
  end if;

  -- Prices come from menu_items, never from the client.
  select sum(m.price * r.quantity) into v_subtotal
    from unnest(v_ids, v_qtys) as r(menu_item_id, quantity)
    join public.menu_items m on m.id = r.menu_item_id;

  select * into v_settings from public.site_settings where id = 1;
  if p_fulfillment = 'delivery'
     and not (v_settings.free_delivery_threshold is not null
              and v_subtotal >= v_settings.free_delivery_threshold) then
    v_fee := v_settings.delivery_fee;
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.orders (
    user_id, fulfillment, contact_name, contact_phone, contact_email,
    delivery_address, notes, subtotal, delivery_fee, total, paystack_reference
  ) values (
    v_user, p_fulfillment, trim(p_contact_name), trim(p_contact_phone), v_email,
    case when p_fulfillment = 'delivery' then nullif(trim(p_delivery_address), '') end,
    nullif(trim(p_notes), ''),
    v_subtotal, v_fee, v_subtotal + v_fee, public.new_payment_reference()
  )
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, name, unit_price, quantity)
  select v_order.id, m.id, m.name, m.price, r.quantity
    from unnest(v_ids, v_qtys) as r(menu_item_id, quantity)
    join public.menu_items m on m.id = r.menu_item_id;

  insert into public.order_status_history (order_id, status, changed_by)
  values (v_order.id, 'pending_payment', v_user);

  return query
    select v_order.id, v_order.order_number, v_order.total, v_order.paystack_reference, v_order.contact_email;
end;
$$;

revoke all on function public.create_order(jsonb, text, text, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text, text, text) to authenticated;

-- Retry an unpaid order: Paystack references are single-use, so each new
-- payment attempt gets a fresh one. Owner only, pending orders only.
create or replace function public.renew_payment_reference(p_order_id uuid)
returns table (paystack_reference text, total numeric, contact_email text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
    with renewed as (
      update public.orders o
         set paystack_reference = public.new_payment_reference()
       where o.id = p_order_id
         and o.user_id = auth.uid()
         and o.status = 'pending_payment'
      returning o.paystack_reference, o.total, o.contact_email
    )
    select * from renewed;
end;
$$;

revoke all on function public.renew_payment_reference(uuid) from public, anon;
grant execute on function public.renew_payment_reference(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_order_paid(): service role only, idempotent
-- ---------------------------------------------------------------------------
-- Called by the Paystack webhook and the return-URL verify, AFTER the server
-- has verified the transaction with Paystack. Only pending_payment → paid is
-- ever performed; a repeat call is a no-op (newly_paid = false), so the
-- confirmation email (step 7) can't be sent twice.

create or replace function public.mark_order_paid(p_reference text, p_amount_kobo bigint)
returns table (order_id uuid, newly_paid boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order public.orders;
begin
  select * into v_order
    from public.orders o
   where o.paystack_reference = p_reference
   for update;

  if not found then
    return;
  end if;

  if v_order.status <> 'pending_payment' then
    return query select v_order.id, false;
    return;
  end if;

  if round(v_order.total * 100)::bigint <> p_amount_kobo then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;

  update public.orders o set status = 'paid', paid_at = now() where o.id = v_order.id;
  insert into public.order_status_history (order_id, status) values (v_order.id, 'paid');

  return query select v_order.id, true;
end;
$$;

revoke all on function public.mark_order_paid(text, bigint) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, bigint) to service_role;

revoke all on function public.new_payment_reference() from public, anon, authenticated;
