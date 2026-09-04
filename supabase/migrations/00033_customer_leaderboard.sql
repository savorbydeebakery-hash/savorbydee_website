-- Customers, counted by phone number.
--
-- Grouped on the LAST TEN DIGITS, not the stored text. The orders table
-- already holds one regular under two strings ("9836537447" and
-- "+91 98365 37447") because checkout saves whatever was typed, and grouping
-- on the raw value would show them as two people who ordered once each rather
-- than one who ordered 63 times.
--
-- security_invoker so the view does not become a way around the RLS on
-- orders: whoever queries it sees exactly the orders they could already read.
-- Without this a view owned by postgres would happily hand every customer's
-- name, number and spend to an anonymous caller.
--
-- Cancelled orders still count as a visit. Revenue does not distinguish paid
-- from unpaid either, because delivery is settled in cash and payment status
-- is not a reliable signal yet — the count is the trustworthy column.

create or replace view public.customer_leaderboard
with (security_invoker = true) as
select
  right(regexp_replace(o.guest_phone, '\D', '', 'g'), 10) as phone_key,
  -- The name from their most recent order. FILTER sits directly after the
  -- aggregate; wrapping the call in parens first is a syntax error.
  (array_agg(o.guest_name order by o.created_at desc)
     filter (where o.guest_name is not null and o.guest_name <> ''))[1] as name,
  (array_agg(o.guest_phone order by o.created_at desc))[1] as phone_as_given,
  count(*)                                                 as order_count,
  coalesce(sum(o.total_cents), 0)                          as total_cents,
  min(o.created_at)                                        as first_order_at,
  max(o.created_at)                                        as last_order_at
from public.orders o
where o.guest_phone is not null
  and length(regexp_replace(o.guest_phone, '\D', '', 'g')) >= 10
group by right(regexp_replace(o.guest_phone, '\D', '', 'g'), 10);

comment on view public.customer_leaderboard is
  'Orders per customer, keyed on the last 10 digits of the phone number. security_invoker: RLS on orders still applies.';
