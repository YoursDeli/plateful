-- Plateful — Build Order step 8: order tracking + admin order management
-- docs/cart-checkout-payment-workflow.md §6 (lifecycle),
-- docs/ui-components-and-styling.md §1 (timeline needs per-step timestamps).

-- Cancellation policy (decided 2026-09-29, goes in the Terms page, step 11):
--   * Customers may cancel a PAID order themselves within 30 minutes of
--     payment, while it's still 'paid' (before the kitchen starts preparing).
--     They get a full refund. After that: no customer cancellation, no refund.
--   * The restaurant may cancel any paid/preparing order at any time (e.g.
--     can't fulfil it) — the customer is refunded.
--   * Refunds are issued manually in the Paystack dashboard; staff then
--     "mark refunded" here so nothing is missed.

alter table public.orders
  add column cancelled_at timestamptz,
  add column cancelled_by text check (cancelled_by in ('customer', 'restaurant')),
  add column refunded_at  timestamptz;

-- Staff-only status changes, forward-only, each logged with who did it.
--   paid             → preparing | cancelled
--   preparing        → ready     | cancelled
--   ready            → out_for_delivery (delivery orders) | delivered
--   out_for_delivery → delivered
-- pending_payment → paid stays payment-only (mark_order_paid).
-- Cancelling a PAID order does not refund it — staff refund in Paystack.
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

  return query select p_order_id, p_status;
end;
$$;

revoke all on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- Customer self-cancel: own order, still 'paid', within 30 min of payment.
-- Enforced here (not just by hiding a button), using the DB clock.
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

  return query select p_order_id, 'cancelled'::text;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;

-- Staff record that a cancelled order's refund was issued in Paystack.
create or replace function public.mark_order_refunded(p_order_id uuid)
returns table (id uuid, refunded_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    with done as (
      update public.orders o
         set refunded_at = now()
       where o.id = p_order_id
         and o.status = 'cancelled'
         and o.paid_at is not null
         and o.refunded_at is null
      returning o.id, o.refunded_at
    )
    select * from done;
end;
$$;

revoke all on function public.mark_order_refunded(uuid) from public, anon;
grant execute on function public.mark_order_refunded(uuid) to authenticated;

-- Live updates: admin dashboard (new orders, status changes) and the
-- customer's tracking page. Realtime respects RLS — customers only receive
-- events for their own orders, staff for all.
alter publication supabase_realtime add table public.orders;
