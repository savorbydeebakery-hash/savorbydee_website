-- The four cakes hidden by 00022 are back, at the client's instruction, with
-- the prices and fuller names from the printed Frosted Sponge Cakes card.
--
-- Note this mixes two price lists on purpose. These four take the card's
-- prices (810/860/960/1010) while the other sixteen keep the prices from the
-- list the client sent on 31 Aug (900-1060). The client was shown that the two
-- disagree and chose these numbers, so Funfetti at 810 is now the cheapest
-- cake on a menu whose plain vanilla is 900.
--
-- Applied over the REST API rather than here: the ½ and other non-ASCII
-- characters do not survive the management API's SQL endpoint intact.

update public.menu_items
set is_active = true, base_price_cents = 81000
where name = 'Funfetti';

update public.menu_items
set is_active = true, base_price_cents = 86000
where name = 'Choconilla';

update public.menu_items
set is_active = true, base_price_cents = 96000, name = 'Spiced Carrot with Cream Cheese'
where name = 'Spiced Carrot CC';

update public.menu_items
set is_active = true, base_price_cents = 101000,
    name = 'Sinful Chocolate Indulgence',
    description = 'Chocolate based with a layer of cream cheese and a rich chocolate truffle.'
where name = 'Sinful Choc Indulgence';
