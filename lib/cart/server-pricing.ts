/**
 * Working out what an order actually costs, from the database.
 *
 * Until now the orders API took `unitPriceCents`, `lineTotalCents` and
 * `totalCents` straight out of the request body and wrote them to the orders
 * table. The checkout computes them honestly, but the checkout runs in the
 * customer's browser and the endpoint is a plain POST — so a ₹3,600 cake could
 * be ordered for ₹1, and the kitchen would have had no way to know. The line's
 * `name` came from the body too, so an order could carry a product that does
 * not exist.
 *
 * This recomputes every figure from the menu_items rows. It deliberately calls
 * the same `calculateUnitPrice` the checkout uses, over the same
 * `applyDerivedWeights` output, so the two agree by construction: any
 * disagreement means the data changed between page load and submit, or the
 * body was edited. Reimplementing the arithmetic here would have created a
 * second definition of what a cake costs, and the two would drift.
 */
import { calculateUnitPrice, calculateLineTotal } from "./math";
import { applyDerivedWeights } from "@/lib/menu/weight-tiers";
import type { CartItem, MenuItemForCart } from "./types";

export interface RepricedLine {
  menuItemId: string;
  /** From the database, not from the request. */
  name: string;
  quantity: number;
  selections: CartItem["selections"];
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface RepriceResult {
  lines: RepricedLine[];
  totalCents: number;
  /** Anything that makes the order unfulfillable. Non-empty means refuse. */
  errors: string[];
}

/**
 * Reprice a posted cart against the catalogue.
 *
 * `dbItems` are the rows for the ids in the cart. A line whose item is missing
 * is an error rather than a skip: silently dropping it would accept an order
 * for a product that does not exist and quietly bill for the rest.
 */
export function repriceCart(
  lines: CartItem[],
  dbItems: MenuItemForCart[]
): RepriceResult {
  const errors: string[] = [];

  // Derived weights first. The sponge cakes' ½/1/2 kg prices are computed from
  // the category's multipliers and are not stored on the item, so without this
  // a "2 kg" selection would match no tier and fall back to the half-kilo base
  // price — the server would have priced a ₹3,600 cake at ₹900 all by itself.
  const byId = new Map(applyDerivedWeights(dbItems).map((item) => [item.id, item]));

  const repriced: RepricedLine[] = [];

  for (const line of lines) {
    const item = line.menuItemId ? byId.get(line.menuItemId) : undefined;
    if (!item) {
      errors.push(
        `${line.name || "An item"} is no longer on the menu. Please remove it from your basket.`
      );
      continue;
    }

    const quantity = Math.floor(line.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      errors.push(`${item.name}: invalid quantity.`);
      continue;
    }

    // A minimum the checkout enforces in the browser only. Mini cupcakes go in
    // sixes because that is how many fit a tray.
    const minimum = item.min_order_qty ?? 1;
    if (quantity < minimum) {
      errors.push(`${item.name} is sold in ${minimum}s. Please order at least ${minimum}.`);
      continue;
    }

    const unitPriceCents = calculateUnitPrice(item, line.selections ?? {});
    repriced.push({
      menuItemId: item.id,
      name: item.name,
      quantity,
      selections: line.selections ?? {},
      unitPriceCents,
      lineTotalCents: calculateLineTotal(unitPriceCents, quantity),
    });
  }

  return {
    lines: repriced,
    totalCents: repriced.reduce((sum, l) => sum + l.lineTotalCents, 0),
    errors,
  };
}

/**
 * Does the browser's total need the customer to look again?
 *
 * Only when the posted total is LOWER than the true one. That is the shape of
 * both problems worth stopping: a tampered body, and a basket priced before an
 * increase. A posted total that is too HIGH is a price that has come down
 * since the page loaded — the server's cheaper figure is used and the sale
 * goes through, because refusing an order in the customer's favour would be a
 * checkout outage dressed up as a safety check.
 *
 * The tolerance is one rupee, to absorb nothing more than rounding.
 */
export function postedTotalIsShort(
  postedCents: number | null | undefined,
  trueCents: number,
  toleranceCents = 100
): boolean {
  if (postedCents == null || !Number.isFinite(postedCents)) return false;
  return postedCents < trueCents - toleranceCents;
}
