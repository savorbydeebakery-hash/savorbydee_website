/**
 * Every photo is checked and, when large, shrunk in the browser before it is
 * uploaded (client report, 2026-10-31).
 *
 * WHY THE CHECK: a photo from Dee's Samsung arrived cut off part-way through
 * (Butterscotch Bento: 565 KB of a 2904×3104 JPEG with no end marker). The
 * browser draws as much of such a file as it has, so the preview showed half
 * the cake; Supabase's resizer refuses it outright, so the saved item showed
 * a broken image. Phones hand over files like this when a photo is picked
 * before the gallery app has finished saving an edit. Now she is told to pick
 * it again instead.
 *
 * WHY THE SHRINK: phone photos are 4–9 MB. 31 gallery photos were over 4 MB
 * each (302 MB of the free plan's 1 GB), and every visitor's phone fetched
 * them. Nothing on the site shows a photo wider than 2000px.
 */

export const MAX_EDGE = 2000;
/** Below this, a photo that is also small enough in pixels is left alone. */
const SMALL_BYTES = 1_500_000;

export class UploadImageError extends Error {}

/**
 * Is this file complete? Looks for each format's end marker. Only JPEG, PNG
 * and WebP are checked; anything else is decoded below, and a failed decode
 * is caught there.
 */
export function imageLooksComplete(bytes: Uint8Array): boolean {
  const n = bytes.length;
  if (n < 12) return false;
  // JPEG: starts FF D8, must end with FF D9 (a few padding bytes are allowed).
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let i = n - 2; i >= Math.max(0, n - 64); i--) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) return true;
    }
    return false;
  }
  // PNG: the last chunk is IEND.
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const tail = String.fromCharCode(...bytes.subarray(Math.max(0, n - 16)));
    return tail.includes("IEND");
  }
  // WebP: RIFF header carries the file length.
  if (String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") {
    const declared = (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0;
    return declared + 8 <= n;
  }
  return true;
}

const INCOMPLETE =
  "This photo didn’t come through completely, so it would show half the picture. Open it in your phone’s gallery once, then pick it again (or take a screenshot of it and upload that).";
const UNREADABLE =
  "This photo’s format can’t be shown on websites (for example an iPhone HEIC photo). Please choose a JPG or PNG.";

/** The file to upload: the original when it is already small, else a shrunk copy. */
export async function prepareImageUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type)) return file;

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageLooksComplete(bytes)) throw new UploadImageError(INCOMPLETE);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UploadImageError(UNREADABLE);
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_EDGE && file.size <= SMALL_BYTES) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / longest);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // PNGs may be see-through (banners, logos), so they become WebP, which keeps
  // transparency; photos become JPEG.
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const type = keepAlpha ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  if (!blob || blob.size >= file.size) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${keepAlpha ? "webp" : "jpg"}`, { type });
}
