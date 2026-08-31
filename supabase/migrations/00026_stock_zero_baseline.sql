-- Start every item's stock counter at 0, at the client's explicit instruction
-- after being shown what it does.
--
-- READ THIS BEFORE RUNNING IT. 0 does not mean "untracked" — it means "out of
-- stock". Every item on the storefront will show as out of stock, grey out and
-- refuse an add-to-cart until a real number is entered against it. That is the
-- intended state here: the counts are being entered from admin afterwards.
--
-- To undo completely — back to no counters anywhere, everything orderable:
--   update public.menu_items set stock_count = null;

update public.menu_items set stock_count = 0;
