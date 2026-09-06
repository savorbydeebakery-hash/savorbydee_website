/**
 * What notice and bulk rule actually applies to an item.
 *
 * The item and category boxes are deliberately blank-means-inherit, which is
 * the right storage rule — null and 0 have to stay different, or clearing a
 * box would silently remove the notice window instead of restoring the
 * default. But it leaves the client looking at an empty field with no way to
 * tell whether this cake needs two hours, twenty-four, or five days.
 *
 * This resolves the same chain the order API does — item, then category, then
 * the menu's default — so the form can print the answer next to the box. It is
 * a mirror of `getRequiredNoticeHours` in lib/cart/validation.ts, narrowed to
 * one item and reporting WHERE the number came from. If that chain ever
 * changes, this has to change with it; the order API stays the authority.
 */

export interface NoticeInputs {
  /** Null/undefined means inherit. */
  itemHours?: number | null;
  categoryHours?: number | null;
  categoryName?: string | null;
  /** false for preorder, true for the daily menu. */
  dailyMenu: boolean;
  globalNoticeHours: number;
  preorderNoticeHours: number;
  /** Custom cakes are quoted, and their window is a floor under everything. */
  requiresCustomNotice?: boolean;
  customCakeNoticeDays: number;
}

export interface BulkInputs {
  itemThreshold?: number | null;
  categoryThreshold?: number | null;
  categoryName?: string | null;
  siteThreshold: number;
}

export type RuleSource = "item" | "category" | "menu" | "site" | "custom";

export interface ResolvedRule {
  value: number;
  source: RuleSource;
  /** A sentence for the form, e.g. "24 hours — inherited from Cheesecakes". */
  explanation: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function resolveNotice(input: NoticeInputs): ResolvedRule {
  const menuDefault = input.dailyMenu ? input.globalNoticeHours : input.preorderNoticeHours;
  const menuName = input.dailyMenu ? "today's menu" : "the preorder menu";

  let value: number;
  let source: RuleSource;
  let from: string;

  if (input.itemHours != null) {
    value = input.itemHours;
    source = "item";
    from = "set on this item";
  } else if (input.categoryHours != null) {
    value = input.categoryHours;
    source = "category";
    from = `inherited from ${input.categoryName?.trim() || "its category"}`;
  } else {
    value = menuDefault;
    source = "menu";
    from = `the default for ${menuName}`;
  }

  // A custom cake's window is a floor, not an override: it applies only when
  // it is longer than whatever was resolved above, which is the same "largest
  // wins" rule the cart uses across a whole basket.
  if (input.requiresCustomNotice) {
    const customHours = input.customCakeNoticeDays * 24;
    if (customHours > value) {
      return {
        value: customHours,
        source: "custom",
        explanation: `up to ${plural(input.customCakeNoticeDays, "day", "days")} — this is marked a custom cake, which overrides a shorter notice`,
      };
    }
  }

  return { value, source, explanation: `${plural(value, "hour", "hours")} — ${from}` };
}

export function resolveBulk(input: BulkInputs): ResolvedRule {
  if (input.itemThreshold != null) {
    return {
      value: input.itemThreshold,
      source: "item",
      explanation: `more than ${input.itemThreshold} — set on this item`,
    };
  }
  if (input.categoryThreshold != null) {
    return {
      value: input.categoryThreshold,
      source: "category",
      explanation: `more than ${input.categoryThreshold} — inherited from ${input.categoryName?.trim() || "its category"}`,
    };
  }
  return {
    value: input.siteThreshold,
    source: "site",
    explanation: `more than ${input.siteThreshold} — the site default`,
  };
}
