-- Save the morning's stock counts in one go.
--
-- The daily menu's stock has to be entered every morning, and until now that
-- meant opening forty-five items one at a time. The new Today's Stock screen
-- lets staff type every number and press Save once. This is what that Save
-- calls.
--
-- One statement, so it is all or nothing. Saving forty-five separate updates
-- from the browser would leave a half-applied morning whenever one failed — a
-- dropped connection at item thirty, and the counts would be a mixture of
-- today's and yesterday's with nothing on screen saying which. A negative
-- count trips menu_items_stock_count_non_negative and rolls the whole save
-- back, which is the behaviour a person entering numbers expects.
--
-- security INVOKER, not definer: it runs as the caller, so the existing
-- menu_items_write_staff policy decides who may use it. A visitor who calls it
-- updates nothing. Compare decrement_stock, which is definer because the order
-- API calls it on behalf of an anonymous customer.
--
-- Takes [{"id": "<uuid>", "stock": 12}]. A null stock means "not tracked" and
-- is written as NULL, which is different from 0 (out of stock).

create or replace function public.set_stock_counts(lines jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  changed integer;
begin
  update public.menu_items m
  set stock_count = case
      when jsonb_typeof(l -> 'stock') = 'null' then null
      else (l ->> 'stock')::integer
    end
  from jsonb_array_elements(lines) as l
  where m.id = (l ->> 'id')::uuid;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

comment on function public.set_stock_counts is
  'Sets stock_count on many menu items in one transaction. Runs as the caller, so RLS applies.';

revoke all on function public.set_stock_counts(jsonb) from public, anon;
grant execute on function public.set_stock_counts(jsonb) to authenticated;
