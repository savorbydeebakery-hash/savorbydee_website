import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/seo";

/**
 * /cart, /login, /orders and the like are deliberately not listed: Google has
 * to be able to open them to read their noindex (next.config.ts). A page blocked
 * here can still be indexed from links to it, without its content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
