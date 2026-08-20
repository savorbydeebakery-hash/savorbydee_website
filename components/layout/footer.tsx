import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-ink/8 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <span className="text-xl font-bold text-ink">SAVOR</span>
            <p className="text-sm text-ink-soft max-w-xs">
              Handcrafted cakes, desserts & savoury bakes. Made fresh to order in Kolkata.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">Explore</h3>
            <Link href="/menu" className="text-sm text-ink-soft hover:text-pink transition-colors">Menu</Link>
            <Link href="/about" className="text-sm text-ink-soft hover:text-pink transition-colors">About Us</Link>
            <Link href="/custom-cake" className="text-sm text-ink-soft hover:text-pink transition-colors">Custom Cakes</Link>
            <Link href="/orders/lookup" className="text-sm text-ink-soft hover:text-pink transition-colors">Find My Order</Link>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">Get in Touch</h3>
            <a
              href="https://wa.me/919836537447"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-soft hover:text-pink transition-colors"
            >
              WhatsApp: +91 98365 37447
            </a>
            <Link href="/about" className="text-sm text-ink-soft hover:text-pink transition-colors">
              Location & Hours
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-ink/5 pt-6 text-center">
          <p className="text-xs text-ink-faint">
            © {year} SAVOR Bakery. All rights reserved. Made with 🧡 in Kolkata.
          </p>
        </div>
      </div>
    </footer>
  );
}
