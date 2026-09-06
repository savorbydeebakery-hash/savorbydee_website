/**
 * The option lists on a menu item — weight tiers, add-ons, variants,
 * decoration and sizes — as rows a person can edit.
 *
 * These five lists were previously edited as raw JSON in a controlled
 * textarea whose onChange did `try { JSON.parse(...) } catch {}`. That is not
 * a rough edge, it is an inert control: React restores a controlled input's
 * DOM value after every change event, so a keystroke that leaves the text
 * un-parseable is reverted. Adding an object to `[]` passes through `[{` on
 * the way, which never parses, so the box could not be typed into at all —
 * verified against the running app, where typing a complete valid array one
 * character at a time left the field on `[]`.
 *
 * Every weight tier and decoration on the live site was therefore set by
 * hand-written SQL. Migrations 00022 and 00034 are that history.
 *
 * The rows below are what the form edits now. Keeping the shape rules here,
 * rather than in the component, means the awkward parts — a blank row is not
 * an option, an empty list is `[]` and not null, prices arrive as typed text —
 * are testable without rendering anything.
 */
import { optionLabel } from "@/lib/cart/types";
import type { Addon, PriceOption } from "@/lib/cart/types";
import { rupeeInputToPaise } from "./money";

/** Which money key a list uses. Weight tiers set a price; the rest adjust one. */
export type OptionValueKey = "price" | "price_delta";

/**
 * A row mid-edit. `amount` is the raw text from the box, not a number: the
 * client is allowed to be part-way through typing "1", "1.", "1.5" without the
 * field fighting them, which is the whole failure being fixed here.
 */
export interface OptionRowDraft {
  label: string;
  amount: string;
  /** Add-ons only. Undefined for the other lists. */
  isActive?: boolean;
}

/**
 * Turn stored options into editable rows.
 *
 * Reads the text through `optionLabel` because the `variants` column was
 * seeded under `name` rather than `label`. Taking `o.label` directly would
 * show those four items' flavours as blank rows, and a blank row is dropped on
 * save — so simply opening Pannacotta Cup and pressing Save would have deleted
 * its six flavours.
 */
export function toOptionDrafts(
  options: PriceOption[] | null | undefined,
  key: OptionValueKey,
  paiseToText: (paise: number | null | undefined) => string
): OptionRowDraft[] {
  return (options ?? []).map((o) => ({
    label: optionLabel(o),
    amount: paiseToText(o[key] ?? 0),
  }));
}

/**
 * Rows back to stored options.
 *
 * A row with no label is dropped rather than saved as `{label: "", ...}`: the
 * storefront matches a selection by label, so a blank one is an option nobody
 * can ever pick and every list would collect them from stray "Add row" clicks.
 * A blank amount becomes 0, which for a delta means "no change" and for a
 * price means free — both are real, deliberate values.
 */
export function fromOptionDrafts(rows: OptionRowDraft[], key: OptionValueKey): PriceOption[] {
  return rows
    .filter((r) => r.label.trim() !== "")
    .map((r) => ({
      label: r.label.trim(),
      [key]: rupeeInputToPaise(r.amount) ?? 0,
    })) as PriceOption[];
}

/** Add-ons carry a name and an active flag instead of a label and a delta. */
export function toAddonDrafts(
  addons: Addon[] | null | undefined,
  paiseToText: (paise: number | null | undefined) => string
): OptionRowDraft[] {
  return (addons ?? []).map((a) => ({
    label: a.name ?? "",
    amount: paiseToText(a.price ?? 0),
    // Absent means active. The storefront treats `is_active !== false` as on,
    // and older rows were written without the key at all.
    isActive: a.is_active !== false,
  }));
}

export function fromAddonDrafts(rows: OptionRowDraft[]): Addon[] {
  return rows
    .filter((r) => r.label.trim() !== "")
    .map((r) => ({
      name: r.label.trim(),
      price: rupeeInputToPaise(r.amount) ?? 0,
      is_active: r.isActive !== false,
    }));
}

/**
 * Category weight multipliers, e.g. a kilo is 2x the half.
 *
 * Same row shape, but the number is a multiplier and not money, so it is not
 * scaled by 100. A multiplier of 0 or less would price a cake at nothing and
 * is dropped along with blank labels.
 */
export interface WeightMultiplierDraft {
  label: string;
  multiplier: string;
}

export function toMultiplierDrafts(value: unknown): WeightMultiplierDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m): m is { label?: unknown; multiplier?: unknown } => typeof m === "object" && m !== null)
    .map((m) => ({
      label: typeof m.label === "string" ? m.label : "",
      multiplier: typeof m.multiplier === "number" ? String(m.multiplier) : "",
    }));
}

/**
 * Rows back to the stored column.
 *
 * Returns null, not `[]`, when nothing survives. Null is what
 * `readMultipliers` treats as "this category prices each weight explicitly",
 * and an empty array would read the same but says something different in the
 * database — a category the client emptied should look untouched, not
 * configured-with-nothing.
 */
export function fromMultiplierDrafts(
  rows: WeightMultiplierDraft[]
): { label: string; multiplier: number }[] | null {
  const parsed = rows
    .filter((r) => r.label.trim() !== "")
    .map((r) => ({ label: r.label.trim(), multiplier: Number(r.multiplier.trim()) }))
    .filter((r) => Number.isFinite(r.multiplier) && r.multiplier > 0);
  return parsed.length > 0 ? parsed : null;
}
