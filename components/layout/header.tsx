"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X, User, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart/store";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/custom-cake", label: "Custom Cakes" },
  { href: "/orders/lookup", label: "Find My Order" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();

  // Transparent over the hero, glass once past it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const getSession = async () => {
      const {
        data: { user: current },
      } = await supabase.auth.getUser();
      setUser(current ? { email: current.email } : null);
      setLoaded(true);
    };

    void getSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email } : null);
      setLoaded(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled
            ? "border-b border-ink/8 bg-porcelain/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="text-2xl font-bold tracking-tight text-ink">
              SAVOR
            </span>
            <span className="hidden text-xs font-medium text-berry sm:inline">
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
                    ? "bg-pink-soft text-berry"
                    : "text-ink-soft hover:bg-pink-soft/50 hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {loaded && user ? (
              <Link
                href="/account"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft hover:bg-pink-soft hover:text-ink transition-colors"
              >
                <User size={20} />
                <span className="hidden max-w-[90px] truncate text-sm sm:inline">
                  {user.email?.split("@")[0]}
                </span>
              </Link>
            ) : (
              <Link
                href={loginHref}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft hover:bg-pink-soft hover:text-ink transition-colors"
              >
                <LogIn size={20} />
                <span className="text-sm">Log In</span>
              </Link>
            )}

            <Link
              href="/cart"
              className="relative rounded-lg p-2 text-ink-soft hover:bg-pink-soft hover:text-ink transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={22} />
              {/* Was a hardcoded "0" inside a permanently `hidden` span — the
                  badge never rendered and never reflected the cart. */}
              {totalItems > 0 && (
                <span
                  id="cart-badge"
                  aria-label={`${totalItems} item${totalItems === 1 ? "" : "s"} in cart`}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-berry px-1 text-[10px] font-bold text-white"
                >
                  {totalItems}
                </span>
              )}
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
              {loaded && user ? (
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-berry"
                >
                  My Account
                </Link>
              ) : (
                <Link
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-berry"
                >
                  Log In
                </Link>
              )}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-pink-soft text-berry"
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
