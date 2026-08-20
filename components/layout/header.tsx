"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About" },
  { href: "/custom-cake", label: "Custom Cakes" },
  { href: "/orders/lookup", label: "Find My Order" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="text-2xl font-bold tracking-tight text-ink">
              SAVOR
            </span>
            <span className="hidden text-xs font-medium text-pink sm:inline">
              bakery
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-pink-soft text-pink"
                    : "text-ink-soft hover:bg-pink-soft/50 hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="relative rounded-lg p-2 text-ink-soft hover:bg-pink-soft hover:text-ink transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={22} />
              <span
                id="cart-badge"
                className="absolute -right-0.5 -top-0.5 hidden h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white"
              >
                0
              </span>
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="rounded-lg p-2 text-ink-soft hover:bg-pink-soft md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute left-0 right-0 top-16 bg-white border-b border-ink/8 shadow-lg">
            <div className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-pink-soft text-pink"
                      : "text-ink-soft hover:bg-pink-soft/50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
