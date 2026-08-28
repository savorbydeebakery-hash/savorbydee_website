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
};

export default nextConfig;
