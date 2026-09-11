-- Let the daily E2E run clear up after itself.
--
-- Three specs place a real order and one files a real enquiry, which is what
-- makes them worth running — but the daily schedule means roughly three orders
-- and one enquiry a day, for ever, plus a staff alarm email each morning. The
-- orders table had already collected 72 such rows before it was cleared by
-- hand.
--
-- There is no delete policy on orders at all: staff can select and update, and
-- nothing can delete. So a cleanup needs either the service-role key in CI, or
-- this. The service-role key can read and write every customer's details and
-- would sit in a repository secret for the sake of removing a handful of test
-- rows — far more authority than the job needs. A narrow function instead.
--
-- The bounds matter more than the function does. It can only ever remove rows
-- that are ALL of:
--
--   * named as one of the fixtures the specs use,
--   * unpaid — a row that took money is never test data, whatever it is called,
--   * created in the last two days, so it can never sweep history,
--   * and requested by a signed-in member of staff.
--
-- A customer genuinely called "Alarm Test" who paid, or who ordered last week,
-- is safe on any one of those counts.

create or replace function public.purge_e2e_rows()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_orders integer := 0;
  removed_inquiries integer := 0;
  doomed uuid[];
begin
  if not public.is_staff() then
    raise exception 'Only staff may purge test rows';
  end if;

  select coalesce(array_agg(id), '{}')
    into doomed
  from public.orders
  where guest_name = any (array[
          'E2E Test Customer',
          'Alarm Test',
          'Rule Probe',
          'Probe Check',
          'Price Probe',
          'Razorpay Test'
        ])
    and payment_status = 'unpaid'
    and created_at > now() - interval '2 days';

  delete from public.order_items where order_id = any (doomed);
  delete from public.orders where id = any (doomed);
  get diagnostics removed_orders = row_count;

  delete from public.custom_cake_inquiries
  where customer_name = 'Cake Inquiry Test'
    and created_at > now() - interval '2 days';
  get diagnostics removed_inquiries = row_count;

  return jsonb_build_object('orders', removed_orders, 'inquiries', removed_inquiries);
end;
$$;

comment on function public.purge_e2e_rows is
  'Removes the rows the E2E suite creates. Staff only; unpaid only; last two days only.';

-- Staff only. anon and authenticated-but-not-staff are refused by the guard
-- above, but there is no reason for the function to be callable by an
-- anonymous visitor at all.
revoke all on function public.purge_e2e_rows() from public, anon;
grant execute on function public.purge_e2e_rows() to authenticated;
