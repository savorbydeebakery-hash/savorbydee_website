import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    return Promise.resolve(
      ["/admin/:path*", "/account/:path*", "/cart/:path*", "/orders/:path*", "/login", "/forgot-password", "/reset-password"].map(
        (source) => ({ source, headers: noindex })
      )
    );
  },
};

export default nextConfig;
