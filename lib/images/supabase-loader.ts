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
  // Not a Supabase public-storage URL → hand back untouched.
  if (!src.includes(PUBLIC_OBJECT_PATH)) return src;

  const params = new URLSearchParams({
    width: String(Math.min(width, MAX_TRANSFORM_WIDTH)),
    quality: String(quality ?? 72),
    resize: "cover",
  });

  return `${src.replace(PUBLIC_OBJECT_PATH, PUBLIC_RENDER_PATH)}?${params}`;
}
