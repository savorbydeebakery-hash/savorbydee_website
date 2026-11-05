/**
 * The gallery's folders, in the order they're shown (client, 2026-11-05). Dee files
 * each photo in Admin → Gallery; gallery_photos.folder holds the slug. Adding one
 * here is all a new folder needs.
 */
export const GALLERY_FOLDERS = [
  { slug: "wedding", label: "Wedding Cakes" },
  { slug: "kids", label: "Kids Cakes" },
  { slug: "pg18", label: "PG18 Cakes" },
  { slug: "floral", label: "Floral Cakes" },
  { slug: "3d", label: "3D Cakes" },
  { slug: "custom-donuts", label: "Custom Donuts" },
  { slug: "custom-cookies", label: "Custom Cookies" },
  { slug: "adult", label: "Adult Cakes" },
] as const;

/** A photo's width and height from its file, or null if the browser can't read it. */
export async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}
