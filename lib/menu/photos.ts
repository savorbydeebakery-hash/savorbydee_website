/**
 * Photos on Preorder Menu items are hidden for now (client, 2026-10-31): only
 * 22 of 79 have one, and a menu where some cards have photos and most don't
 * looks unfinished. Today's Menu keeps its photos. When Dee has photos for
 * the preorder items she turns them back on in Settings
 * (site_settings.show_preorder_photos, migration 00055; missing means off).
 *
 * Applied where the public pages load items, so the cards, the item pop-up,
 * the cart (which copies image_url when an item is added) and the gallery all
 * follow from one place. Admin still sees and edits every photo.
 */
export function showPreorderPhotos(settings: unknown): boolean {
  return (settings as { show_preorder_photos?: boolean | null } | null)?.show_preorder_photos === true;
}

export function applyPhotoRule<T extends { daily_menu?: boolean | null; image_url?: string | null }>(
  items: T[] | null | undefined,
  showPreorder: boolean
): T[] {
  return (items ?? []).map((item) =>
    !showPreorder && item.daily_menu === false && item.image_url ? { ...item, image_url: null } : item
  );
}
