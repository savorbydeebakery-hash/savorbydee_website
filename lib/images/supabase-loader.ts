"use client";

/**
 * next/image custom loader → Supabase Storage image-transform endpoint.
 *
 * Rewrites  /storage/v1/object/public/<bucket>/<path>
 * to        /storage/v1/render/image/public/<bucket>/<path>?width=&quality=&resize=contain
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
 * Historically this hint switched the transform between resize=cover and
 * resize=contain. It no longer changes the URL — see RESIZE below — but it is
 * still stripped, because a #contain left on the end of the src would be
 * carried into the <img> and is not part of the object path.
 *
 * A hash fragment is never sent to the server, so it is a safe carrier for a
 * hint that only this loader needs to read.
 */
const CONTAIN_HINT = "#contain";

/**
 * ALWAYS contain. This is not a cropping preference, it is the only value that
 * scales correctly when a width is supplied without a height.
 *
 * Measured against gallery/3D cakes 3.jpg, a 3000x4000 source:
 *
 *   ?width=640&resize=cover      -> 640x4000   aspect destroyed
 *   ?width=640 (no resize param) -> 640x4000   same, cover is the default
 *   ?width=640&resize=contain    -> 640x853    correct
 *
 * Supabase's `cover` is documented as filling BOTH dimensions, so with no
 * height to fill it leaves the source height alone. The old default therefore
 * shipped every image at its full source height — roughly five times the
 * intended pixel count on a 4000px-tall phone photo — and nothing looked
 * broken because every call site puts the image in a fixed aspect box where
 * CSS object-fit hides the wrong intrinsic size.
 *
 * Cropping is a CSS concern and stays one: the box keeps object-cover or
 * object-contain as before. This only decides what bitmap arrives.
 */
const RESIZE = "contain";

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
  const clean = src.endsWith(CONTAIN_HINT)
    ? src.slice(0, -CONTAIN_HINT.length)
    : src;

  // Not a Supabase public-storage URL → hand back untouched.
  if (!clean.includes(PUBLIC_OBJECT_PATH)) return clean;

  const params = new URLSearchParams({
    width: String(Math.min(width, MAX_TRANSFORM_WIDTH)),
    quality: String(quality ?? 72),
    resize: RESIZE,
  });

  return `${clean.replace(PUBLIC_OBJECT_PATH, PUBLIC_RENDER_PATH)}?${params}`;
}
