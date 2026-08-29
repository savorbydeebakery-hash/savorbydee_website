import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden bg-cocoa text-shell">
      {/* Oversized wordmark watermark — gives the footer presence without
          adding another element the eye has to read. */}
      <span
        aria-hidden="true"
        className="text-display pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[22vw] leading-none text-shell/[0.04]"
      >
        SAVOR
      </span>
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <span className="font-display text-2xl font-bold text-shell">SAVOR</span>
            <p className="text-sm text-shell/70 max-w-xs">
              Handcrafted cakes, desserts & savoury bakes. Made fresh to order in Shillong.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-2">
            <h3 className="text-eyebrow text-blush">Explore</h3>
            <Link href="/menu" className="text-sm text-shell/70 hover:text-blush transition-colors">Menu</Link>
            <Link href="/about" className="text-sm text-shell/70 hover:text-blush transition-colors">About Us</Link>
            <Link href="/custom-cake" className="text-sm text-shell/70 hover:text-blush transition-colors">Custom Cakes</Link>
            <Link href="/orders/lookup" className="text-sm text-shell/70 hover:text-blush transition-colors">Find My Order</Link>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-2">
            <h3 className="text-eyebrow text-blush">Get in Touch</h3>
            <a
              href="https://wa.me/919836537447"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-shell/70 hover:text-blush transition-colors"
            >
              WhatsApp: +91 98365 37447
            </a>
            <Link href="/about" className="text-sm text-shell/70 hover:text-blush transition-colors">
              Location & Hours
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-shell/10 pt-6 text-center">
          <p className="text-xs text-shell/65">
            © {year} Savor by Dee. All rights reserved. Made with 🧡 in Shillong.
          </p>
        </div>
      </div>
    </footer>
  );
}
