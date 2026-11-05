import type { NextConfig } from "next";

/**
 * What a page may load, in report-only mode: browsers note what it would block in the
 * console and block nothing, so it can't break the site (client, 2026-11-05). To enforce
 * it once it's been seen to stay quiet, rename the header to Content-Security-Policy.
 *
 * 'unsafe-inline' for scripts because Next writes inline scripts without a nonce, and
 * nonces would need every page built per request, which is what the saved pages avoid.
 * 'wasm-unsafe-eval' is the Lottie cake's engine.
 */
const CONTENT_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://images.unsplash.com",
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // No need to tell attackers which framework to look up.
  poweredByHeader: false,

  images: {
    // Next's built-in optimizer needs sharp, which does not run on Cloudflare
    // Workers. We hand optimization to Supabase's transform endpoint instead.
    loader: "custom",
    loaderFile: "./lib/images/supabase-loader.ts",

    // These still drive srcset generation with a custom loader — they decide
    // which widths get requested. Site content maxes out at max-w-6xl (1152px),
    // so ~2304 covers 2x DPR; the stock ladder up to 3840 just wasted entries.
    deviceSizes: [384, 640, 828, 1080, 1200, 1920, 2304],
    imageSizes: [96, 128, 256, 384],
  },

  /**
   * /menu/preorder moved to /menu when the preorder menu became the full menu.
   *
   * A `permanentRedirect()` inside the route component works, but in a
   * streaming context Next emits it as `<meta http-equiv="refresh">` rather
   * than an HTTP status — so the browser fetches a whole page before bouncing,
   * and search engines do not see a real move. Declaring it here makes it a
   * genuine 308 before any rendering happens.
   */
  redirects() {
    return Promise.resolve([
      { source: "/menu/preorder", destination: "/menu", permanent: true },
      // One address for the site, so Google doesn't split it across two. The
      // homepage needs its own rule: on this host "/:path*" with nothing to fill
      // it redirected to the literal address /:path*.
      {
        source: "/",
        has: [{ type: "host" as const, value: "www.savorbydee.in" }],
        destination: "https://savorbydee.in/",
        permanent: true,
      },
      {
        source: "/:path+",
        has: [{ type: "host" as const, value: "www.savorbydee.in" }],
        destination: "https://savorbydee.in/:path+",
        permanent: true,
      },
    ]);
  },

  // Private and one-person pages stay out of search results. A header rather
  // than page metadata, because most of these are client components, and not
  // a robots.txt block, because Google has to open a page to read this.
  headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return Promise.resolve([
      ...["/admin/:path*", "/account/:path*", "/cart/:path*", "/orders/:path*", "/login", "/forgot-password", "/reset-password"].map(
        (source) => ({ source, headers: noindex })
      ),
      // Every page. DENY: another site can't frame this one to trick a tap on
      // Place order or a login box. Referrer: an order page's address carries
      // the customer's phone number, which must not reach other sites.
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // HTTPS only from now on. Six months and this domain only: browsers remember
          // it, so it's hard to take back, and a subdomain may not have HTTPS.
          { key: "Strict-Transport-Security", value: "max-age=15552000" },
          { key: "Content-Security-Policy-Report-Only", value: CONTENT_POLICY },
        ],
      },
    ]);
  },
};

export default nextConfig;
