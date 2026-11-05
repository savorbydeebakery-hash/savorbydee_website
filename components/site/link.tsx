import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * next/link, without fetching pages in the background.
 *
 * By default it fetches every page it has a link to as soon as the link is on screen,
 * so one page view made about 26 requests to the Worker, nearly all for pages nobody
 * opened, like the five policy pages in the footer. Those requests count against the
 * Worker's limit, and a stress test showed it can't spare them (client, 2026-11-05).
 * The page is fetched when it's tapped instead. Every link on the site uses this; a
 * test in lib/site/page-cache.test.ts keeps it that way.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
