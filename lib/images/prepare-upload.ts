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
 * Is this file complete? Walks each format's structure to its end marker.
 * Only JPEG, PNG and WebP are checked; anything else is decoded below, and a
 * failed decode is caught there.
 *
 * The end marker is found by walking, not by looking at the last bytes:
 * Samsung phones put their own data AFTER the photo's end (a "SEFT" trailer,
 * or a whole video for motion photos), so every Samsung photo looked cut off
 * (client report, 2026-11-01).
 */
export function imageLooksComplete(bytes: Uint8Array): boolean {
  const n = bytes.length;
  if (n < 12) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegHasEnd(bytes);
  // PNG: chunks (length, type, data, CRC) until IEND.
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    let i = 8;
    while (i + 8 <= n) {
      const len = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      if (String.fromCharCode(...bytes.subarray(i + 4, i + 8)) === "IEND") return true;
      i += 12 + len;
    }
    return false;
  }
  // WebP: RIFF header carries the file length.
  if (String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") {
    const declared = (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0;
    return declared + 8 <= n;
  }
  return true;
}

/**
 * JPEG: header segments carry their own length (so the small preview copy
 * inside the camera data, with its own end marker, is stepped over); after
 * each image scan, the next FF not followed by 00 or a restart code is the
 * next marker. Complete when the marker is the end (FF D9). A layout this
 * doesn't recognise is left to the decoder rather than refused.
 */
function jpegHasEnd(b: Uint8Array): boolean {
  const n = b.length;
  let i = 2;
  while (i + 1 < n) {
    if (b[i] !== 0xff) return true;
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; } // fill byte
    if (m === 0xd9) return true;
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    if (i + 3 >= n) return false;
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    if (m === 0xda) {
      // Image data: runs until a real marker.
      while (i + 1 < n && !(b[i] === 0xff && b[i + 1] !== 0 && (b[i + 1] < 0xd0 || b[i + 1] > 0xd7))) i++;
    }
  }
  return false;
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
