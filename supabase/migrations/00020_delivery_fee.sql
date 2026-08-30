-- ---------- DELIVERY FEE ----------
-- Delivery is priced by distance and quoted per order by staff, then collected
-- IN CASH on delivery. The bakes themselves are paid for online at checkout.
--
-- This column therefore is NOT part of total_cents and must never be added to
-- it. total_cents is the amount charged through Razorpay, and changing it
-- after a payment has been captured would mean the order record no longer
-- matches what was actually taken from the customer's card — which is exactly
-- what payment reconciliation and any future dispute would be checked against.
--
-- NULL means "not quoted yet", which is different from 0 ("delivered free").
-- Both are real states and the admin panel distinguishes them.

alter table public.orders
  add column if not exists delivery_fee_cents int
  check (delivery_fee_cents is null or delivery_fee_cents >= 0);

comment on column public.orders.delivery_fee_cents is
  'Distance-based delivery charge quoted by staff and collected in cash on delivery. Deliberately excluded from total_cents, which is the Razorpay-captured amount for goods only. NULL = not yet quoted; 0 = delivered free.';

-- Staff filter the board for delivery orders still needing a quote.
create index if not exists idx_orders_delivery_unquoted
  on public.orders (created_at desc)
  where fulfillment = 'delivery' and delivery_fee_cents is null;
