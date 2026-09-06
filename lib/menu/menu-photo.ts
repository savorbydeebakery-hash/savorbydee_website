/**
 * Choosing the photograph that stands for a menu.
 *
 * The homepage's two menu cards are gallery shots. When the client has not
 * picked one in admin, something still has to go there, and "the first photo
 * in the gallery" is a bad default: the gallery opens with 3D novelty cakes
 * and tier cakes, which are custom-order work and are on neither menu. Putting
 * one on the Daily Menu card tells a visitor that today's counter has 3D cakes
 * on it.
 *
 * So the fallback looks for a caption that actually belongs to the menu —
 * bento cakes are on today's list, cupcakes are a preorder category — and only
 * falls back to position when the gallery has nothing matching. It is still a
 * guess; it is a guess that cannot be badly wrong.
 */

export interface GalleryPhoto {
  image_url: string | null;
  caption?: string | null;
}

/**
 * The first photo whose caption contains one of `keywords`, else the photo at
 * `fallbackIndex`, else the first one with an image at all. Null when the
 * gallery is empty.
 *
 * Keywords are matched case-insensitively as substrings, so "bento" finds both
 * "Bento Cakes 1" and "Bento cakes 2" — the live captions are inconsistently
 * capitalised.
 */
export function pickMenuPhoto(
  photos: GalleryPhoto[] | null | undefined,
  keywords: string[],
  fallbackIndex = 0
): string | null {
  const usable = (photos ?? []).filter((p) => Boolean(p.image_url));
  if (usable.length === 0) return null;

  for (const keyword of keywords) {
    const needle = keyword.toLowerCase();
    const hit = usable.find((p) => (p.caption ?? "").toLowerCase().includes(needle));
    if (hit) return hit.image_url;
  }

  // Modulo so a fallbackIndex past the end wraps rather than returning null —
  // a two-photo gallery should still fill both cards.
  return usable[fallbackIndex % usable.length].image_url;
}

/** Keywords per menu, kept next to each other so the two cannot drift apart. */
export const DAILY_MENU_PHOTO_KEYWORDS = ["bento", "bakery"];
export const PREORDER_MENU_PHOTO_KEYWORDS = ["cupcake", "cookie", "bakery"];
// The one place the gallery's showpieces belong: tier and 3D cakes ARE custom
// orders, which is exactly why they are the wrong default for the two menus.
export const CUSTOM_ORDER_PHOTO_KEYWORDS = ["tier", "3d", "custom"];
