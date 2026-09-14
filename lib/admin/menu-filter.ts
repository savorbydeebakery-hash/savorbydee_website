/**
 * Narrowing the admin menu list to the item someone is looking for.
 *
 * The Menu Items page showed all 124 items as one grid with no search, so
 * finding one packet of cookies to change its price meant scrolling past the
 * rest. Kept pure so the rules — what a search matches, what "no category"
 * means — are tested rather than rediscovered in the component.
 */
export type MenuScope = "all" | "daily" | "preorder";

/** "all", a category id, or "none" for items without a category. */
export type CategoryScope = string;

export interface FilterableItem {
  name: string;
  description?: string | null;
  category_id: string | null;
  daily_menu: boolean;
}

export function filterMenuItems<T extends FilterableItem>(
  items: T[],
  { query, category, menu }: { query: string; category: CategoryScope; menu: MenuScope }
): T[] {
  // Every word must appear, in any order: "choco cookie" finds "Chocodip
  // Cookies" as well as "Chocochunks ... Cookies".
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    if (menu === "daily" && !item.daily_menu) return false;
    if (menu === "preorder" && item.daily_menu) return false;

    if (category === "none" && item.category_id !== null) return false;
    if (category !== "all" && category !== "none" && item.category_id !== category) return false;

    if (words.length === 0) return true;
    const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
