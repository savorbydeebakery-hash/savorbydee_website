import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { MotionProvider } from "@/components/motion-provider";
import { SplashLoader } from "@/components/splash-loader";
import { MobileStickyBar } from "@/components/layout/mobile-sticky-bar";
import { ShopStatusProvider, type ShopStatus } from "@/components/shop/shop-status";
import { ClosedBanner } from "@/components/shop/closed-banner";
import { createClient } from "@/lib/supabase/server";
import { getOpenState, DEFAULT_DAILY_MENU_CUTOFF } from "@/lib/shop/open-state";
import type { WeeklyHours } from "@/lib/cart/validation";

/**
 * DM Sans, one family for the whole site.
 *
 * The reference brand (brookibakehouse.com) sets --font-body-family,
 * --font-heading-family, --font-navigation-family and --font-button-family all
 * to DM Sans; the display/body serif+sans pairing this site used before has no
 * equivalent there. globals.css points --font-display at --font-sans so every
 * existing `font-display` utility and .text-h1/.text-h2 rule keeps resolving.
 *
 * Loaded once. Requesting the same family twice under two variable names is
 * two downloads of the same bytes.
 */
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Belt and braces with the CSS `color-scheme: only light` in globals.css. The CSS
 * property is what actually opts the page out of Chrome Android's auto-dark
 * algorithm; this emits the matching <meta name="color-scheme"> so the browser
 * knows before stylesheets have loaded, which avoids a dark first paint.
 */
export const viewport: Viewport = {
  colorScheme: "only light",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Savor by Dee | Handcrafted Cakes & Desserts in Shillong",
  description:
    "Pre-order handcrafted cakes, desserts, cookies and savoury bakes from Savor by Dee, the artisanal bakery in Shillong. Custom cakes, bulk orders, and delivery available.",
  keywords: ["bakery", "cakes", "Shillong", "custom cakes", "desserts", "pre-order", "Meghalaya"],
  openGraph: {
    title: "Savor by Dee | Handcrafted Cakes & Desserts in Shillong",
    description: "Pre-order handcrafted cakes, desserts, and savoury bakes. Made fresh to order in Shillong.",
    type: "website",
  },
};

/**
 * Whether the bakery is taking orders, resolved once per request and handed to
 * every card and modal through context.
 *
 * Read here rather than per page because the answer has to be the same
 * everywhere and the cards that need it sit several levels down. Every failure
 * path returns "open": a settings read that breaks must not hang a CLOSED sign
 * on a bakery that is actually trading. The order API applies the same rule
 * authoritatively, so failing open here costs a clear refusal at checkout
 * rather than a silently accepted order.
 */
async function readShopStatus(): Promise<ShopStatus> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("weekly_hours, holidays, daily_menu_cutoff")
      .eq("id", 1)
      .single();

    const state = getOpenState(
      (data?.weekly_hours as WeeklyHours | null) ?? null,
      (data?.holidays as string[] | null) ?? [],
      data?.daily_menu_cutoff ?? DEFAULT_DAILY_MENU_CUTOFF
    );

    return {
      isOpen: state.isOpen,
      dailyMenuOpen: state.dailyMenuOpen,
      nextOpenIso: state.nextOpen?.toISOString() ?? null,
      reason: state.reason,
    };
  } catch {
    return { isOpen: true, dailyMenuOpen: true, nextOpenIso: null, reason: "open" };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shopStatus = await readShopStatus();

  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bk-bg">
        {/* Liquid-glass refraction filter. Defined once, referenced by
            .glass-liquid via filter: url(#liquid-glass). */}
        <svg aria-hidden="true" className="absolute h-0 w-0" focusable="false">
          <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.008"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="softNoise"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>

        <SplashLoader />
        <ShopStatusProvider value={shopStatus}>
          <MotionProvider>
            <ScrollToTop />
            <Header />
            <ClosedBanner />
            <main className="flex-1">{children}</main>
            <Footer />
            <WhatsAppWidget />
            <MobileStickyBar />
          </MotionProvider>
        </ShopStatusProvider>
      </body>
    </html>
  );
}
