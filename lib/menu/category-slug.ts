/**
 * A category as a URL, e.g. "Frosted Sponge Cakes" -> "frosted-sponge-cakes".
 *
 * So another page can send a customer straight to one section of the menu —
 * the custom cake form points people who want a standard cake at the sponge
 * cakes rather than making them hunt for them. Matched on the name rather than
 * the id so the link reads as English and survives a category being deleted
 * and recreated; a rename breaks it, which the fallback below absorbs.
 */
export function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The category a `?category=` value refers to, by slug or id, or "all".
 *
 * An unknown value lands on the whole menu rather than an empty one: a stale
 * link should still show the customer something to buy.
 */
export function resolveCategoryParam(
  param: string | null | undefined,
  categories: { id: string; name: string }[]
): string {
  const wanted = param?.trim().toLowerCase();
  if (!wanted) return "all";
  const hit = categories.find((c) => c.id === wanted || categorySlug(c.name) === wanted);
  return hit ? hit.id : "all";
}
