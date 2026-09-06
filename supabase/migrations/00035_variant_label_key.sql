-- Variants were stored under the wrong key, so four items showed blank buttons.
--
-- Every other option list on menu_items uses {label, ...}, and every reader
-- looks for `label`: components/item-detail-modal.tsx renders `v.label` and
-- lib/cart/math.ts matches the customer's choice on it. The `variants` column
-- was seeded as {name, price_delta} instead, so:
--
--   Pannacotta Cup            6 flavours
--   Gourmet Cupcake           4 flavours
--   Tartlettes - Fresh Fruits 2 flavours
--   Tartlettes - Chocolate    2 flavours
--
-- rendered as buttons with no text on them, and the selection could never be
-- matched back. No money was lost — every price_delta is 0, they are flavour
-- choices — but a customer choosing "Vanilla" from six identical blank buttons
-- was choosing nothing, and the order arrived without the flavour on it.
--
-- Renames the key in place and leaves the values alone. `optionLabel` in
-- lib/cart/types.ts reads either key, so a cart already sitting in someone's
-- browser keeps working after this runs.

update public.menu_items
set variants = (
  select jsonb_agg(
    case
      when v ? 'name' and not (v ? 'label')
        then (v - 'name') || jsonb_build_object('label', v -> 'name')
      else v
    end
    order by ordinality
  )
  from jsonb_array_elements(variants) with ordinality as t(v, ordinality)
)
where jsonb_typeof(variants) = 'array'
  and jsonb_array_length(variants) > 0
  and exists (
    select 1 from jsonb_array_elements(variants) as e
    where e ? 'name' and not (e ? 'label')
  );
