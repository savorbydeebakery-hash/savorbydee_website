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
    ]);
  },
};

export default nextConfig;
