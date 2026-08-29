"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, UtensilsCrossed, ShoppingBag, Images, Info } from "lucide-react";
import { useCart } from "@/lib/cart/store";

/**
 * Phone-only bottom navigation, built to Brooki's spec: 63px tall, white,
 * a five-column grid, 24px icons over 14.4px labels, and a soft upward shadow
 * rather than a border. It hides on scroll down and comes back on scroll up.
 *
 * Their five slots are Home / Search / Cart / Products / About. Savor has no
 * search page, so that slot goes to Gallery, which is the thing customers
 * actually browse here.
 *
 * TAP TARGETS: the row is 63px but each cell is padded to a 56px minimum
 * height, so every target clears the 44px floor even though the label is small.
 *
 * SAFE AREA: iOS puts a home indicator under this bar. Without the
 * env(safe-area-inset-bottom) padding the labels sit beneath it.
 */

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/about", label: "About", icon: Info },
];

export function MobileStickyBar() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;

      // 6px of slack, or the bar flickers on the sub-pixel scroll jitter a
      // trackpad and iOS rubber-banding both produce.
      if (Math.abs(dy) > 6) {
        // Never hide near the top: at y < 80 the page has barely moved and a
        // disappearing nav there reads as a glitch.
        setHidden(dy > 0 && y > 80);
        lastY.current = y;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[11] border-t border-bk-border bg-bk-bg shadow-[-1px_-2px_10px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden"
      style={{
        transform: hidden ? "translateY(100%)" : "translateY(0)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ul className="grid grid-cols-5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="relative">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2.5 transition-colors ${
                  active ? "text-bk-fg" : "text-bk-muted"
                }`}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
                  {href === "/cart" && totalItems > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bk-red px-1 text-[10px] font-semibold leading-none text-white"
                    >
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </span>

                <span className="text-[0.9rem] leading-none">{label}</span>

                {href === "/cart" && totalItems > 0 && (
                  <span className="sr-only">
                    {totalItems} item{totalItems === 1 ? "" : "s"} in cart
                  </span>
                )}
              </Link>

              {/* Hairline between cells, matching the reference. Not a
                  border-right on the link, which would also draw after the
                  last cell. */}
              {href !== LINKS[LINKS.length - 1].href && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-3 right-0 w-px bg-bk-border"
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
