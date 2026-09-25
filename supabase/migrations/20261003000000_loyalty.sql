-- Plateful — Build Order step 10: loyalty points
-- docs/accounts-loyalty-and-images.md §2, CLAUDE.md §6, docs/progress.md.
--
-- Rules:
--   * Earn floor(floor(order.total / 1000) * loyalty_points_per_1000) whole
--     points on the NET amount paid (after referral bonus / points), credited
--     when the order is DELIVERED/COLLECTED (client decision 2026-09-25 —
--     same as referrals; cancelled orders never earn).
--   * 1 point = ₦1 at checkout, applied AFTER the referral bonus; together
--     they never exceed the food subtotal. Returned on cancel / expiry.
--   * loyalty_enabled = false: no new earning or redemption; balances kept;
--     already-committed redemptions on open orders are honoured.
--   * Balances change only with a loyalty_ledger row in the same transaction.

-- Profile guard: also protect the loyalty caches from direct client writes.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.role                        := old.role;
    new.referral_code               := old.referral_code;
    new.referred_by                 := old.referred_by;
    new.referral_balance            := old.referral_balance;
    new.referral_earned_total       := old.referral_earned_total;
    new.loyalty_points_balance      := old.loyalty_points_balance;
    new.loyalty_points_earned_total := old.loyalty_points_earned_total;
  end if;
  return new;
end;
$$;

alter table public.site_settings
  add column loyalty_enabled boolean not null default true,
  add column loyalty_points_per_1000 numeric(8, 2) not null default 10
    check (loyalty_points_per_1000 >= 0 and loyalty_points_per_1000 <= 1000);

grant update (loyalty_enabled, loyalty_points_per_1000) on public.site_settings to authenticated;

alter table public.profiles
  add column loyalty_points_balance      integer not null default 0,
  add column loyalty_points_earned_total integer not null default 0;

alter table public.orders
  add column loyalty_points_earned   integer not null default 0 check (loyalty_points_earned >= 0),
  add column loyalty_points_redeemed integer not null default 0 check (loyalty_points_redeemed >= 0);

create table public.loyalty_ledger (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  points       integer not null check (points <> 0),
  reason       text not null check (reason in ('order_earned', 'checkout_redemption', 'redemption_refund')),
  reference_id uuid,
  created_at   timestamptz not null default now()
);

create index loyalty_ledger_user_idx on public.loyalty_ledger (user_id, created_at desc);
create index loyalty_ledger_reference_idx on public.loyalty_ledger (reference_id, reason);

alter table public.loyalty_ledger enable row level security;

create policy "loyalty_ledger: read own or staff"
  on public.loyalty_ledger for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

grant select on public.loyalty_ledger to authenticated;
grant select, insert, update, delete on public.loyalty_ledger to service_role;

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------

-- Return points spent on an order (cancel / expiry). Idempotent.
create or replace function public._refund_loyalty_redemption(p_order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders o where o.id = p_order_id;
  if not found or v_order.loyalty_points_redeemed <= 0 then
    return;
  end if;
  if (select coalesce(sum(l.points), 0)
        from public.loyalty_ledger l
       where l.reference_id = p_order_id
         and l.reason in ('checkout_redemption', 'redemption_refund')) >= 0 then
    return; -- already refunded
  end if;

  insert into public.loyalty_ledger (user_id, points, reason, reference_id)
  values (v_order.user_id, v_order.loyalty_points_redeemed, 'redemption_refund', p_order_id);
  update public.profiles p
     set loyalty_points_balance = p.loyalty_points_balance + v_order.loyalty_points_redeemed
   where p.id = v_order.user_id;
end;
$$;

-- Award points when an order is delivered (if the program is on). Idempotent.
create or replace function public._award_loyalty_on_delivery(p_order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order    public.orders;
  v_settings public.site_settings;
  v_points   integer;
begin
  select * into v_order from public.orders o where o.id = p_order_id;
  if not found or v_order.status <> 'delivered' or v_order.loyalty_points_earned > 0 then
    return;
  end if;
  select * into v_settings from public.site_settings s where s.id = 1;
  if not v_settings.loyalty_enabled then
    return;
  end if;

  v_points := floor(floor(v_order.total / 1000) * v_settings.loyalty_points_per_1000);
  if v_points <= 0 then
    return;
  end if;

  insert into public.loyalty_ledger (user_id, points, reason, reference_id)
  values (v_order.user_id, v_points, 'order_earned', p_order_id);
  update public.profiles p
     set loyalty_points_balance      = p.loyalty_points_balance + v_points,
         loyalty_points_earned_total = p.loyalty_points_earned_total + v_points
   where p.id = v_order.user_id;
  update public.orders o set loyalty_points_earned = v_points where o.id = p_order_id;
end;
$$;

revoke all on function public._refund_loyalty_redemption(uuid) from public, anon, authenticated;
revoke all on function public._award_loyalty_on_delivery(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stale checkout cleanup: now returns referral bonus AND points (one pass).
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_count integer := 0;
begin
  for v_id in
    update public.orders o
       set status = 'failed'
     where o.status = 'pending_payment'
       and o.created_at < now() - interval '24 hours'
    returning o.id
  loop
    insert into public.order_status_history (order_id, status) values (v_id, 'failed');
    perform public._refund_referral_redemption(v_id);
    perform public._refund_loyalty_redemption(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_order(): + p_apply_loyalty (after referral bonus)
-- ---------------------------------------------------------------------------
drop function if exists public.create_order(jsonb, text, text, text, text, text, boolean);

create function public.create_order(
  p_items            jsonb,
  p_fulfillment      text,
  p_contact_name     text,
  p_contact_phone    text,
  p_delivery_address text,
  p_notes            text,
  p_apply_referral   boolean default false,
  p_apply_loyalty    boolean default false
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
  v_ids      uuid[];
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

  select array_agg(s.menu_item_id), array_agg(s.quantity)
    into v_ids, v_qtys
    from (
      select (e ->> 'menu_item_id')::uuid as menu_item_id,
             sum((e ->> 'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_items) e
       group by 1
    ) s;

  select count(*) into v_bad
    from unnest(v_ids, v_qtys) as r(menu_item_id, quantity)
    left join public.menu_items m on m.id = r.menu_item_id
   where m.id is null or not m.is_available or r.quantity < 1 or r.quantity > 50;
  if v_bad > 0 then
    raise exception 'items_unavailable' using errcode = 'P0001';
  end if;

  select sum(m.price * r.quantity) into v_subtotal
    from unnest(v_ids, v_qtys) as r(menu_item_id, quantity)
    join public.menu_items m on m.id = r.menu_item_id;

  select * into v_settings from public.site_settings where id = 1;
  if p_fulfillment = 'delivery'
     and not (v_settings.free_delivery_threshold is not null
              and v_subtotal >= v_settings.free_delivery_threshold) then
    v_fee := v_settings.delivery_fee;
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
    delivery_address, notes, subtotal, delivery_fee, referral_bonus_applied,
    loyalty_points_redeemed, total, paystack_reference, status, paid_at
  ) values (
    v_user, p_fulfillment, trim(p_contact_name), trim(p_contact_phone), v_email,
    case when p_fulfillment = 'delivery' then nullif(trim(p_delivery_address), '') end,
    nullif(trim(p_notes), ''),
    v_subtotal, v_fee, v_bonus, v_points, v_total,
    -- Nothing to charge → no Paystack call at all (accounts doc §2 step 3).
    case when v_total = 0 then null else public.new_payment_reference() end,
    case when v_total = 0 then 'paid' else 'pending_payment' end,
    case when v_total = 0 then now() end
  )
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, name, unit_price, quantity)
  select v_order.id, m.id, m.name, m.price, r.quantity
    from unnest(v_ids, v_qtys) as r(menu_item_id, quantity)
    join public.menu_items m on m.id = r.menu_item_id;

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

revoke all on function public.create_order(jsonb, text, text, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text, text, text, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_order_paid(): expired-then-paid re-takes the points too.
-- ---------------------------------------------------------------------------
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

  if v_order.status not in ('pending_payment', 'failed') then
    return query select v_order.id, false;
    return;
  end if;

  if round(v_order.total * 100)::bigint <> p_amount_kobo then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;

  if v_order.status = 'failed' then
    -- Bonus/points were returned at expiry; the payment is real, so take them again.
    if v_order.referral_bonus_applied > 0
       and (select coalesce(sum(l.amount), 0) from public.referral_ledger l
             where l.reference_id = v_order.id
               and l.reason in ('checkout_redemption', 'redemption_refund')) >= 0 then
      insert into public.referral_ledger (user_id, amount, reason, reference_id)
      values (v_order.user_id, -v_order.referral_bonus_applied, 'checkout_redemption', v_order.id);
      update public.profiles p
         set referral_balance = p.referral_balance - v_order.referral_bonus_applied
       where p.id = v_order.user_id;
    end if;
    if v_order.loyalty_points_redeemed > 0
       and (select coalesce(sum(l.points), 0) from public.loyalty_ledger l
             where l.reference_id = v_order.id
               and l.reason in ('checkout_redemption', 'redemption_refund')) >= 0 then
      insert into public.loyalty_ledger (user_id, points, reason, reference_id)
      values (v_order.user_id, -v_order.loyalty_points_redeemed, 'checkout_redemption', v_order.id);
      update public.profiles p
         set loyalty_points_balance = p.loyalty_points_balance - v_order.loyalty_points_redeemed
       where p.id = v_order.user_id;
    end if;
  end if;

  update public.orders o set status = 'paid', paid_at = now() where o.id = v_order.id;
  insert into public.order_status_history (order_id, status) values (v_order.id, 'paid');

  return query select v_order.id, true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status changes: cancel → return bonus + points; delivered → referral
-- credit + loyalty points.
-- ---------------------------------------------------------------------------
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order public.orders;
  v_ok    boolean;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  v_ok := case v_order.status
    when 'paid'             then p_status in ('preparing', 'cancelled')
    when 'preparing'        then p_status in ('ready', 'cancelled')
    when 'ready'            then p_status = 'delivered'
                                 or (p_status = 'out_for_delivery' and v_order.fulfillment = 'delivery')
    when 'out_for_delivery' then p_status = 'delivered'
    else false
  end;
  if not v_ok then
    raise exception 'invalid_transition' using errcode = 'P0001',
      detail = format('%s → %s', v_order.status, p_status);
  end if;

  update public.orders o
     set status       = p_status,
         cancelled_at = case when p_status = 'cancelled' then now() else o.cancelled_at end,
         cancelled_by = case when p_status = 'cancelled' then 'restaurant' else o.cancelled_by end
   where o.id = p_order_id;
  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order_id, p_status, auth.uid());

  if p_status = 'cancelled' then
    perform public._refund_referral_redemption(p_order_id);
    perform public._refund_loyalty_redemption(p_order_id);
  elsif p_status = 'delivered' then
    perform public._complete_referral_on_delivery(p_order_id);
    perform public._award_loyalty_on_delivery(p_order_id);
  end if;

  return query select p_order_id, p_status;
end;
$$;

create or replace function public.cancel_my_order(p_order_id uuid)
returns table (id uuid, status text)
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
   where o.id = p_order_id and o.user_id = auth.uid()
   for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'paid' then
    raise exception 'cancel_not_allowed' using errcode = 'P0001';
  end if;
  if v_order.paid_at is null or now() > v_order.paid_at + interval '30 minutes' then
    raise exception 'cancel_window_closed' using errcode = 'P0001';
  end if;

  update public.orders o
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer'
   where o.id = p_order_id;
  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order_id, 'cancelled', auth.uid());
  perform public._refund_referral_redemption(p_order_id);
  perform public._refund_loyalty_redemption(p_order_id);

  return query select p_order_id, 'cancelled'::text;
end;
$$;
