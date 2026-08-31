-- The five prices the old admin-menu-edit test had overwritten with 999,
-- supplied by the client. Two also came with corrected names.
--
-- Classic NY Baked is priced by weight, so it moves off the flat price model
-- onto weight_tiers. base_price_cents stays as the ½ kg price because that is
-- what the storefront shows as "from", and the tiers carry both options.

begin;

update public.menu_items
set base_price_cents = 34000
where name = 'Plain Vanilla';

update public.menu_items
set base_price_cents = 4500
where name = 'Vanilla Cupcake';

update public.menu_items
set name = 'Cucumber & Mint Cheese Sandwich', base_price_cents = 5000
where name = 'Cucumber & Mint Sandwich';

update public.menu_items
set name = 'Classic Tiramisu Tub', base_price_cents = 30000
where name = 'Tiramisu Tub';

update public.menu_items
set base_price_cents = 100000,
    price_model = 'weight_tiers',
    price_options = '[{"label": "½ kg", "price": 100000}, {"label": "1 kg", "price": 200000}]'::jsonb
where name = 'Classic NY Baked';

commit;
