-- Customers leaderboard: count what was actually bought.
--
-- The view summed every order ever placed, cancelled and unpaid ones included,
-- because when it was written payment_status meant nothing reliable. With
-- manual UPI (migration 00045) "paid" is set by staff only after seeing the
-- money arrive, so it is now the most reliable column there is.
--
-- Existing columns keep their names and types (CREATE OR REPLACE VIEW cannot
-- rename or reorder them); the new ones are added at the end:
--   order_count      now excludes cancelled orders
--   total_cents      now excludes cancelled orders
--   paid_order_count orders staff have marked paid (or paid then refunded? no:
--                    refunded money was given back, so it is not counted)
--   paid_cents       what actually arrived, from payment_received_cents
--
-- The admin page reads paid_cents when present and falls back to total_cents,
-- so it works before and after this is applied.

create or replace view public.customer_leaderboard
with (security_invoker = true) as
select
  right(regexp_replace(o.guest_phone, '\D', '', 'g'), 10) as phone_key,
  (array_agg(o.guest_name order by o.created_at desc)
     filter (where o.guest_name is not null and o.guest_name <> ''))[1] as name,
  (array_agg(o.guest_phone order by o.created_at desc))[1] as phone_as_given,
  count(*) filter (where o.status <> 'cancelled')          as order_count,
  coalesce(sum(o.total_cents) filter (where o.status <> 'cancelled'), 0) as total_cents,
  min(o.created_at)                                        as first_order_at,
  max(o.created_at)                                        as last_order_at,
  count(*) filter (where o.payment_status = 'paid')        as paid_order_count,
  coalesce(
    sum(coalesce(o.payment_received_cents, o.total_cents))
      filter (where o.payment_status = 'paid'),
    0
  )                                                        as paid_cents
from public.orders o
where o.guest_phone is not null
  and length(regexp_replace(o.guest_phone, '\D', '', 'g')) >= 10
group by right(regexp_replace(o.guest_phone, '\D', '', 'g'), 10);

comment on view public.customer_leaderboard is
  'Orders per customer, keyed on the last 10 digits of the phone number. Counts exclude cancelled orders; paid_* count only staff-verified payments. security_invoker: RLS on orders still applies.';
