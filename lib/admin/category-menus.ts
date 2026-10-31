/**
 * Which menu each category is on, and what is in it, for the Categories page
 * (client, 2026-10-31: "it's not properly organised; hard to tell which
 * category is for what"). A category has no menu of its own; it is on
 * Today's Menu, the Preorder Menu or both according to the items filed in it.
 */

export interface CategoryItem {
  id: string;
  name: string;
  category_id: string | null;
  daily_menu: boolean | null;
  is_active?: boolean | null;
}

export type CategoryMenu = "daily" | "preorder" | "both" | "empty";
export type CategoryView = "all" | "daily" | "preorder";

export interface CategoryContents {
  daily: CategoryItem[];
  preorder: CategoryItem[];
  menu: CategoryMenu;
}

export function categoryContents(categoryIds: string[], items: CategoryItem[]): Record<string, CategoryContents> {
  const out: Record<string, CategoryContents> = {};
  for (const id of categoryIds) out[id] = { daily: [], preorder: [], menu: "empty" };
  for (const item of items) {
    const c = item.category_id ? out[item.category_id] : undefined;
    if (!c) continue;
    (item.daily_menu ? c.daily : c.preorder).push(item);
  }
  for (const c of Object.values(out)) {
    const byName = (a: CategoryItem, b: CategoryItem) => a.name.localeCompare(b.name);
    c.daily.sort(byName);
    c.preorder.sort(byName);
    c.menu = c.daily.length && c.preorder.length ? "both" : c.daily.length ? "daily" : c.preorder.length ? "preorder" : "empty";
  }
  return out;
}

/** Is this category shown under the chosen tab? Empty ones only under All. */
export function inView(contents: CategoryContents | undefined, view: CategoryView): boolean {
  if (view === "all") return true;
  if (!contents) return false;
  return view === "daily" ? contents.daily.length > 0 : contents.preorder.length > 0;
}
