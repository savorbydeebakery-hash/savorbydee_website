/**
 * Turning the morning stock screen's text boxes into a save.
 *
 * Two rules matter more than they look:
 *
 * A blank box means "leave it alone", not "stop tracking". Clearing a box by
 * accident must not turn a counted item into one that never runs out — the
 * storefront treats NULL stock as unlimited, so a stray backspace would let
 * customers order a cake that was never baked. Untracking an item stays a
 * deliberate choice on the item's own edit screen.
 *
 * Only changed rows are sent. Re-saving forty-five unchanged counts would
 * overwrite any that an order had just decremented in the meantime; sending
 * only what the person actually typed keeps that window as small as it can be.
 */
export interface StockItem {
  id: string;
  name: string;
  stock_count: number | null;
}

export interface StockLine {
  id: string;
  stock: number;
}

export interface StockPlan {
  lines: StockLine[];
  /** Names of items whose box does not hold a whole number of 0 or more. */
  invalid: string[];
}

/** Whole numbers only. Null for blank; NaN for anything that is not a count. */
export function parseStockInput(raw: string | null | undefined): number | null {
  const text = (raw ?? "").trim();
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return Number.NaN;
  return Number(text);
}

export function planStockSave(items: StockItem[], drafts: Record<string, string>): StockPlan {
  const lines: StockLine[] = [];
  const invalid: string[] = [];

  for (const item of items) {
    if (!(item.id in drafts)) continue;
    const parsed = parseStockInput(drafts[item.id]);
    if (parsed === null) continue; // blank: leave it alone
    if (Number.isNaN(parsed)) {
      invalid.push(item.name);
      continue;
    }
    if (parsed !== item.stock_count) lines.push({ id: item.id, stock: parsed });
  }

  return { lines, invalid };
}
