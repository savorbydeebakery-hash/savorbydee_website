/**
 * YouTube links for gallery videos (client request, 2026-10-31): Dee uploads
 * a cake video to YouTube as Unlisted and pastes the link in Admin → Gallery.
 *
 * Only the 11-character video id is stored (gallery_photos.youtube_id); the
 * thumbnail and the player URL are built from it here.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id from any usual YouTube link, or null. */
export function youtubeIdFrom(input: string): string | null {
  const raw = input.trim();
  if (ID.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && ID.test(id) ? id : null;
}

/** The thumbnail YouTube makes for every video. */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** One tile in the public gallery (components/gallery-grid.tsx). */
export interface GalleryItem {
  src: string;
  alt: string;
  caption?: string | null;
  /** A YouTube video (gallery_photos.youtube_id): `src` is its thumbnail,
   *  and the lightbox plays it instead of showing a photo. */
  youtubeId?: string | null;
}

/**
 * A gallery video: YouTube's thumbnail, with the id to play. Here, not in the
 * grid component: the gallery page is a server component, and a function
 * exported from a "use client" file can't be called on the server.
 */
export function videoItem(youtubeId: string, caption?: string | null): GalleryItem {
  return { src: youtubeThumb(youtubeId), alt: caption || "Video from Savor by Dee", caption, youtubeId };
}

/** The player, from the privacy-enhanced domain (no tracking cookies until played). */
export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
}
