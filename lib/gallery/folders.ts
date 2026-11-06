/** A gallery folder (gallery_folders, migration 00059). The slug never changes, so renaming is safe. */
export interface GalleryFolder {
  slug: string;
  label: string;
  sort_order: number;
}

/**
 * The folders the gallery started with (client, 2026-11-05), and still used if the
 * gallery_folders table can't be read, such as before migration 00059 has run. Dee
 * manages the real list in Admin → Gallery → Manage folders.
 */
export const GALLERY_FOLDERS: GalleryFolder[] = [
  { slug: "wedding", label: "Wedding Cakes", sort_order: 1 },
  { slug: "kids", label: "Kids Cakes", sort_order: 2 },
  { slug: "pg18", label: "PG18 Cakes", sort_order: 3 },
  { slug: "floral", label: "Floral Cakes", sort_order: 4 },
  { slug: "3d", label: "3D Cakes", sort_order: 5 },
  { slug: "custom-donuts", label: "Custom Donuts", sort_order: 6 },
  { slug: "custom-cookies", label: "Custom Cookies", sort_order: 7 },
  { slug: "adult", label: "Adult Cakes", sort_order: 8 },
];

export const MAX_FOLDER_NAME = 40;

/**
 * A folder's slug from its name, unique among the ones already there: "Bento Cakes"
 * becomes "bento-cakes", and a second one "bento-cakes-2". A name with no letters or
 * numbers in it, like an emoji, gets "folder".
 */
export function folderSlug(label: string, taken: string[]): string {
  const base =
    label
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "folder";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Why a folder name can't be used, or null if it can. */
export function folderNameProblem(label: string, others: GalleryFolder[]): string | null {
  const name = label.trim();
  if (!name) return "Give the folder a name.";
  if (name.length > MAX_FOLDER_NAME) return `Keep the name to ${MAX_FOLDER_NAME} characters.`;
  if (others.some((f) => f.label.trim().toLowerCase() === name.toLowerCase())) return "There's already a folder with that name.";
  return null;
}

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
