"use client";

/**
 * next/image custom loader → Supabase Storage image-transform endpoint.
 *
 * Rewrites  /storage/v1/object/public/<bucket>/<path>
 * to        /storage/v1/render/image/public/<bucket>/<path>?width=&quality=&resize=cover
 *
 * The render endpoint negotiates WebP/AVIF from the browser's Accept header,
 * so we never request a format explicitly. Measured on this project:
 *
 *   gallery/savor-cake.jpg                         62,302 B  original
 *     ?width=400&quality=70                        39,659 B  JPEG  (-36%)
 *     ?width=400&quality=60  + Accept: image/webp  23,820 B  WebP  (-62%)
 *
 * With `loader: "custom"` this function receives EVERY next/image src — local
 * /public assets and the Unsplash seed URLs from migration 00011 included — so
 * the non-Supabase passthrough below is mandatory, not defensive.
 *
 * Note: 'use client' is required for loaderFile in the App Router; Next has to
 * serialize this function to the client.
 */

/**
 * Callers can opt out of cropping by appending #contain to the src.
 *
 * This matters because `resize=cover` crops SERVER SIDE: the browser never
 * receives the rest of the frame, so no amount of object-contain in CSS can
 * recover it. The client's photos are phone shots with off-centre subjects,
 * and cover was cutting the cake out of the picture entirely.
 *
 * A hash fragment is never sent to the server, so it is a safe carrier for a
 * hint that only this loader needs to read.
 */
const CONTAIN_HINT = "#contain";

/** Supabase caps transform dimensions; stay under it. */
const MAX_TRANSFORM_WIDTH = 2500;

const PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const PUBLIC_RENDER_PATH = "/storage/v1/render/image/public/";

export default function supabaseImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const wantsContain = src.endsWith(CONTAIN_HINT);
  const clean = wantsContain ? src.slice(0, -CONTAIN_HINT.length) : src;

  // Not a Supabase public-storage URL → hand back untouched.
  if (!clean.includes(PUBLIC_OBJECT_PATH)) return clean;

  const params = new URLSearchParams({
    width: String(Math.min(width, MAX_TRANSFORM_WIDTH)),
    quality: String(quality ?? 72),
    resize: wantsContain ? "contain" : "cover",
  });

  return `${clean.replace(PUBLIC_OBJECT_PATH, PUBLIC_RENDER_PATH)}?${params}`;
}
