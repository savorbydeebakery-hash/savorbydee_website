-- Cake weights, and Basic/Custom decoration.
--
-- WEIGHTS. Sponge cakes were priced with size_options deltas of +0 / +10000 /
-- +30000 on a 90000 base — so a 1 kg cake sold for ₹1000 against ₹900 for the
-- half, and 2 kg for ₹1200. Twice the cake for eleven percent more. The
-- client's rule is 1 kg = 2x the half and 2 kg = 2x the kilo.
--
-- Stored as MULTIPLIERS on the category rather than as prices on each item, so
-- the relationship survives a price change: editing a cake to ₹950 makes its
-- kilo ₹1900 by itself. Baking the numbers into each row would have left the
-- kilo at the old figure the first time anyone touched a base price.
--
-- Cheesecakes deliberately get none. Their two weights are real prices the
-- client set, and they do not all double — Chocolate & Raspberry is
-- ₹1000/₹1900, not ₹2000. A multiplier there would overwrite a deliberate
-- number with an arithmetic one.
--
-- The multipliers apply only to made-to-order items. The daily menu's Blueberry
-- Cake 500 Gms and the bento cakes live in the same category but are baked at a
-- fixed size; offering "2 kg" of a 250 g bento would be nonsense. That
-- condition lives in the code, keyed on daily_menu.

alter table public.categories
  add column if not exists weight_multipliers jsonb;

comment on column public.categories.weight_multipliers is
  'Derives weight options from base_price_cents, e.g. [{"label":"1 kg","multiplier":2}]. NULL = the category prices each weight explicitly. Applies to preorder items only.';

update public.categories
set weight_multipliers = '[
  {"label": "½ kg", "multiplier": 1},
  {"label": "1 kg",  "multiplier": 2},
  {"label": "2 kg",  "multiplier": 4}
]'::jsonb
where id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

-- The old deltas are wrong and are now derived, so the stale copy goes rather
-- than sitting there ready to be picked up by some other code path.
update public.menu_items
set size_options = '[]'::jsonb,
    price_model = 'flat'
where category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f'
  and daily_menu = false;

-- DECORATION. Basic or Custom, nothing between. Custom carries no price: it
-- sends the customer to the custom cake enquiry, where the design is quoted
-- individually, rather than pretending a flat +₹100 covers any decoration.
update public.menu_items
set decoration_tiers = '[
  {"label": "Basic",  "price_delta": 0},
  {"label": "Custom", "price_delta": 0}
]'::jsonb
where category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f'
  and daily_menu = false;
