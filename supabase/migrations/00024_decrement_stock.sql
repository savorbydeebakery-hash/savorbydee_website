-- Atomically reduce stock for the lines in an order.
--
-- Done as a function rather than a read-modify-write from the API because two
-- customers checking out at the same second would otherwise both read "3 left"
-- and both write "1 left". The subtraction has to happen inside the database,
-- in one statement, against the current value.
--
-- greatest(...) floors at zero: staff also sell over the counter and adjust
-- the number by hand, so a count can legitimately be lower than a web order
-- expects by the time it commits. Clamping is the right failure — a negative
-- stock figure on the storefront would be worse than an early zero.
--
-- Rows with stock_count null are untracked and deliberately left alone.

create or replace function public.decrement_stock(lines jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.menu_items m
  set stock_count = greatest(0, m.stock_count - (l->>'qty')::int)
  from jsonb_array_elements(lines) as l
  where m.id = (l->>'id')::uuid
    and m.stock_count is not null;
$$;

revoke all on function public.decrement_stock(jsonb) from public, anon, authenticated;
grant execute on function public.decrement_stock(jsonb) to service_role;
