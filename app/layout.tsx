import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { MotionProvider } from "@/components/motion-provider";
import { SplashLoader } from "@/components/splash-loader";

/**
 * Display — Fraunces. Soft high-contrast serif; warm rather than cold, which
 * is the register a bakery wants. `opsz` lets the same family go from 14px
 * captions to 120px headlines without looking stretched; SOFT rounds the
 * terminals slightly; WONK enables the angled italic-ish forms.
 * `wght` is always included and must NOT be listed in `axes`.
 */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

/**
 * Body/UI — Plus Jakarta Sans. Geometric-humanist with slightly rounded
 * terminals; the closest Google-hosted match to General Sans.
 *
 * SWAP POINT: to use General Sans instead, drop GeneralSans-Variable.woff2
 * into public/fonts/ and replace this with next/font/local:
 *   const sans = localFont({
 *     src: "../public/fonts/GeneralSans-Variable.woff2",
 *     variable: "--font-sans", weight: "200 700", display: "swap",
 *   });
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Savor by Dee — Handcrafted Cakes & Desserts in Shillong",
  description:
    "Pre-order handcrafted cakes, desserts, cookies and savoury bakes from Savor by Dee, the artisanal bakery in Shillong. Custom cakes, bulk orders, and delivery available.",
  keywords: ["bakery", "cakes", "Shillong", "custom cakes", "desserts", "pre-order", "Meghalaya"],
  openGraph: {
    title: "Savor by Dee — Handcrafted Cakes & Desserts in Shillong",
    description: "Pre-order handcrafted cakes, desserts, and savoury bakes. Made fresh to order in Shillong.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
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
        <MotionProvider>
          <ScrollToTop />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppWidget />
        </MotionProvider>
      </body>
    </html>
  );
}
