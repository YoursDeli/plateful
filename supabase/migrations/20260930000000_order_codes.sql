-- Plateful — customer-facing order codes (client request 2026-09-29):
-- 5 uppercase alphanumeric characters (e.g. K7Q2M) instead of 1001, 1002…
-- Alphabet skips look-alikes (0/O, 1/I/L) so codes read cleanly over the
-- phone: 31 chars ^ 5 ≈ 28.6M combinations. `order_number` stays as an
-- internal sequence (create_order still returns it) but is no longer shown.

create or replace function public.new_order_code()
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
    for i in 1..5 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.orders o where o.order_code = code);
  end loop;
  return code;
end;
$$;

revoke all on function public.new_order_code() from public, anon, authenticated;

alter table public.orders add column order_code text;

-- Backfill existing orders.
update public.orders set order_code = public.new_order_code() where order_code is null;

alter table public.orders
  alter column order_code set not null,
  add constraint orders_order_code_key unique (order_code),
  add constraint orders_order_code_format check (order_code ~ '^[A-Z0-9]{5}$');

-- Every new order gets a code automatically (create_order is unchanged).
create or replace function public.set_order_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_code is null then
    new.order_code := public.new_order_code();
  end if;
  return new;
end;
$$;

create trigger orders_set_order_code
  before insert on public.orders
  for each row execute function public.set_order_code();
