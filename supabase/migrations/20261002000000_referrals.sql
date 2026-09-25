-- Plateful — Build Order step 9: referral program
-- docs/pages-referrals-footer.md §5, CLAUDE.md §6, docs/progress.md 2026-09-25.
--
-- Rules:
--   * Every profile gets a 6-char referral_code. Link: /?ref=CODE.
--   * A BRAND-NEW account (created < 24h ago, no orders) signing in with a
--     ref cookie gets a pending referral (self-referral blocked).
--   * Referrer is credited site_settings.referral_bonus_amount when the
--     friend's FIRST order is DELIVERED/COLLECTED (client decision: not on
--     payment — cancelled orders never earn anything).
--   * Balance is spendable only at checkout (create_order), capped at the
--     food subtotal. Returned if that order is cancelled or expires unpaid.
--   * profiles.referral_balance / referral_earned_total change ONLY together
--     with a referral_ledger row, in the same transaction (CLAUDE.md §6).

-- ---------------------------------------------------------------------------
-- Fix: the profile guard must key on the DATABASE role, not the JWT.
-- Inside security-definer functions (create_order etc.) the JWT still says
-- 'authenticated', which made the old guard revert trusted writes.
-- current_user is the function owner there, and 'authenticated'/'anon' only
-- for direct client writes.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.role                  := old.role;
    new.referral_code         := old.referral_code;
    new.referred_by           := old.referred_by;
    new.referral_balance      := old.referral_balance;
    new.referral_earned_total := old.referral_earned_total;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings + profile columns
-- ---------------------------------------------------------------------------
alter table public.site_settings
  add column referral_bonus_amount numeric(12, 2) not null default 200
    check (referral_bonus_amount >= 0);

grant update (referral_bonus_amount) on public.site_settings to authenticated;

create or replace function public.new_referral_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.referral_code = code);
  end loop;
  return code;
end;
$$;

revoke all on function public.new_referral_code() from public, anon, authenticated;

alter table public.profiles
  add column referral_code         text,
  add column referred_by           uuid references public.profiles (id) on delete set null,
  add column referral_balance      numeric(12, 2) not null default 0,
  add column referral_earned_total numeric(12, 2) not null default 0;

-- Backfill codes for existing accounts (runs as postgres → guard allows it).
update public.profiles set referral_code = public.new_referral_code() where referral_code is null;

alter table public.profiles
  alter column referral_code set not null,
  add constraint profiles_referral_code_key unique (referral_code),
  add constraint profiles_referral_code_format check (referral_code ~ '^[A-Z0-9]{6}$');

-- New accounts get a code at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    public.new_referral_code()
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- referrals + referral_ledger (read-only for clients)
-- ---------------------------------------------------------------------------
create table public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references public.profiles (id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles (id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'completed')),
  reward_amount    numeric(12, 2),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  constraint referrals_not_self check (referrer_id <> referred_user_id)
);

create index referrals_referrer_idx on public.referrals (referrer_id, status, completed_at);

create table public.referral_ledger (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount <> 0),
  reason       text not null check (reason in ('referral_reward', 'checkout_redemption', 'redemption_refund')),
  reference_id uuid,
  created_at   timestamptz not null default now()
);

create index referral_ledger_user_idx on public.referral_ledger (user_id, created_at desc);
create index referral_ledger_reference_idx on public.referral_ledger (reference_id, reason);

alter table public.referrals enable row level security;
alter table public.referral_ledger enable row level security;

create policy "referrals: read own or staff"
  on public.referrals for select to authenticated
  using (referrer_id = (select auth.uid()) or referred_user_id = (select auth.uid()) or (select public.is_staff()));

create policy "referral_ledger: read own or staff"
  on public.referral_ledger for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

grant select on public.referrals, public.referral_ledger to authenticated;
grant select, insert, update, delete on public.referrals, public.referral_ledger to service_role;

alter table public.orders
  add column referral_bonus_applied numeric(12, 2) not null default 0
    check (referral_bonus_applied >= 0);

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients; used inside definer functions)
-- ---------------------------------------------------------------------------

-- Return a redeemed bonus to the customer (cancel / expiry). Idempotent.
create or replace function public._refund_referral_redemption(p_order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders o where o.id = p_order_id;
  if not found or v_order.referral_bonus_applied <= 0 then
    return;
  end if;
  -- Net redeemed for this order so far (negative = still redeemed).
  if (select coalesce(sum(l.amount), 0)
        from public.referral_ledger l
       where l.reference_id = p_order_id
         and l.reason in ('checkout_redemption', 'redemption_refund')) >= 0 then
    return; -- already refunded
  end if;

  insert into public.referral_ledger (user_id, amount, reason, reference_id)
  values (v_order.user_id, v_order.referral_bonus_applied, 'redemption_refund', p_order_id);
  update public.profiles p
     set referral_balance = p.referral_balance + v_order.referral_bonus_applied
   where p.id = v_order.user_id;
end;
$$;

-- Credit the referrer when the referred friend's FIRST order is delivered.
create or replace function public._complete_referral_on_delivery(p_order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order    public.orders;
  v_referral public.referrals;
  v_reward   numeric(12, 2);
begin
  select * into v_order from public.orders o where o.id = p_order_id;
  if not found or v_order.status <> 'delivered' then
    return;
  end if;
  -- Only their first-ever delivered order counts.
  if (select count(*) from public.orders o
       where o.user_id = v_order.user_id and o.status = 'delivered') <> 1 then
    return;
  end if;

  select * into v_referral
    from public.referrals r
   where r.referred_user_id = v_order.user_id and r.status = 'pending'
   for update;
  if not found then
    return;
  end if;

  select s.referral_bonus_amount into v_reward from public.site_settings s where s.id = 1;

  update public.referrals r
     set status = 'completed', reward_amount = v_reward, completed_at = now()
   where r.id = v_referral.id;

  if v_reward > 0 then
    insert into public.referral_ledger (user_id, amount, reason, reference_id)
    values (v_referral.referrer_id, v_reward, 'referral_reward', v_referral.id);
    update public.profiles p
       set referral_balance      = p.referral_balance + v_reward,
           referral_earned_total = p.referral_earned_total + v_reward
     where p.id = v_referral.referrer_id;
  end if;
end;
$$;

revoke all on function public._refund_referral_redemption(uuid) from public, anon, authenticated;
revoke all on function public._complete_referral_on_delivery(uuid) from public, anon, authenticated;

-- Abandoned checkouts: unpaid for 24h → 'failed', bonus returned. Called
-- lazily (at checkout and from the admin board) — no scheduler needed.
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
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_orders() from public, anon;
grant execute on function public.expire_stale_orders() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- claim_referral(): link a brand-new account to the referrer's code
-- ---------------------------------------------------------------------------
create or replace function public.claim_referral(p_code text)
returns text   -- 'claimed' | 'invalid_code' | 'self' | 'not_eligible'
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_referrer uuid;
begin
  if v_user is null then
    return 'not_eligible';
  end if;

  select p.id into v_referrer from public.profiles p where p.referral_code = upper(trim(p_code));
  if v_referrer is null then
    return 'invalid_code';
  end if;
  if v_referrer = v_user then
    return 'self';
  end if;

  -- Only brand-new accounts: created in the last 24h, never referred, no orders.
  if not exists (select 1 from auth.users u where u.id = v_user and u.created_at > now() - interval '24 hours')
     or exists (select 1 from public.referrals r where r.referred_user_id = v_user)
     or exists (select 1 from public.orders o where o.user_id = v_user) then
    return 'not_eligible';
  end if;

  insert into public.referrals (referrer_id, referred_user_id) values (v_referrer, v_user);
  update public.profiles p set referred_by = v_referrer where p.id = v_user;
  return 'claimed';
end;
$$;

revoke all on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;

-- ---------------------------------------------------------------------------
-- create_order(): + optional referral redemption, + ₦0 orders paid instantly
-- (signature changes → drop the step-6 version first)
-- ---------------------------------------------------------------------------
drop function if exists public.create_order(jsonb, text, text, text, text, text);

create function public.create_order(
  p_items            jsonb,
  p_fulfillment      text,
  p_contact_name     text,
  p_contact_phone    text,
  p_delivery_address text,
  p_notes            text,
  p_apply_referral   boolean default false
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
  v_ids      uuid[];
  v_qtys     integer[];
  v_bad      integer;
  v_subtotal numeric(12, 2);
  v_fee      numeric(12, 2) := 0;
  v_bonus    numeric(12, 2) := 0;
  v_balance  numeric(12, 2);
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

  -- Release bonuses locked in abandoned checkouts before spending any.
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

  -- Referral bonus: re-checked here (never trusted from the client), capped
  -- at the food subtotal. Row lock prevents double-spending in parallel.
  if p_apply_referral then
    select p.referral_balance into v_balance
      from public.profiles p where p.id = v_user for update;
    v_bonus := greatest(0, least(coalesce(v_balance, 0), v_subtotal));
  end if;

  v_total := v_subtotal - v_bonus + v_fee;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.orders (
    user_id, fulfillment, contact_name, contact_phone, contact_email,
    delivery_address, notes, subtotal, delivery_fee, referral_bonus_applied,
    total, paystack_reference, status, paid_at
  ) values (
    v_user, p_fulfillment, trim(p_contact_name), trim(p_contact_phone), v_email,
    case when p_fulfillment = 'delivery' then nullif(trim(p_delivery_address), '') end,
    nullif(trim(p_notes), ''),
    v_subtotal, v_fee, v_bonus, v_total,
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

revoke all on function public.create_order(jsonb, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_order_paid(): also accepts an order that expired while the customer
-- was still paying (payment is real → honour it, re-take the bonus).
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

  -- Expired-then-paid: the bonus was returned at expiry; take it again.
  if v_order.status = 'failed' and v_order.referral_bonus_applied > 0
     and (select coalesce(sum(l.amount), 0) from public.referral_ledger l
           where l.reference_id = v_order.id
             and l.reason in ('checkout_redemption', 'redemption_refund')) >= 0 then
    insert into public.referral_ledger (user_id, amount, reason, reference_id)
    values (v_order.user_id, -v_order.referral_bonus_applied, 'checkout_redemption', v_order.id);
    update public.profiles p
       set referral_balance = p.referral_balance - v_order.referral_bonus_applied
     where p.id = v_order.user_id;
  end if;

  update public.orders o set status = 'paid', paid_at = now() where o.id = v_order.id;
  insert into public.order_status_history (order_id, status) values (v_order.id, 'paid');

  return query select v_order.id, true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status changes now return bonuses on cancel and credit referrers on delivery
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
  elsif p_status = 'delivered' then
    perform public._complete_referral_on_delivery(p_order_id);
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

  return query select p_order_id, 'cancelled'::text;
end;
$$;
