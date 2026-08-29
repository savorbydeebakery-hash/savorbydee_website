import Link from "next/link";
import { Instagram, Facebook, MessageCircle, ArrowRight } from "lucide-react";

/**
 * Footer in Brooki's structure and palette: white ground, true black type,
 * one wide lead block on the left and three narrow link columns beside it,
 * then a hairline and a quiet legal row.
 *
 * Their lead block is an email-capture form. Savor has no mailing list and no
 * endpoint to post one to, so that slot carries the channel this bakery
 * actually takes orders on instead. A subscribe box that silently discards the
 * address would look more like the reference and be worse than useless.
 *
 * The bottom padding clears the phone-only MobileStickyBar — without it the
 * legal line sits underneath the nav.
 */

const EXPLORE = [
  { href: "/menu", label: "Menu" },
  { href: "/gallery", label: "Gallery" },
  { href: "/custom-cake", label: "Custom Cakes" },
  { href: "/about", label: "About" },
];

const SERVICE = [
  { href: "/orders/lookup", label: "Find My Order" },
  { href: "/cart", label: "Cart" },
  { href: "/account", label: "My Account" },
];

const INFO = [
  { href: "/about", label: "Location & Hours" },
  { href: "/custom-cake", label: "Bulk & Custom Orders" },
];

const SOCIALS = [
  { href: "https://www.instagram.com/savorbydee", label: "Instagram", icon: Instagram },
  { href: "https://www.facebook.com/savorbydee", label: "Facebook", icon: Facebook },
  { href: "https://wa.me/919836537447", label: "WhatsApp", icon: MessageCircle },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-bk-border bg-bk-bg text-bk-fg">
      <div className="mx-auto w-full max-w-[var(--bk-page-width)] px-4 pb-28 pt-12 md:px-6 md:pb-14 md:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12 md:gap-8">
          {/* Lead block */}
          <div className="col-span-2 md:col-span-5">
            <p className="bk-section-title">Order on WhatsApp</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-bk-muted">
              Handcrafted cakes, desserts and savoury bakes, made fresh to order
              in Shillong. Message us and we will take it from there.
            </p>
            <a
              href="https://wa.me/919836537447"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-[var(--bk-r-pill)] bg-bk-btn px-6 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85"
            >
              +91 98365 37447 <ArrowRight size={16} />
            </a>
          </div>

          <FooterColumn title="Explore" links={EXPLORE} />
          <FooterColumn title="Customer Service" links={SERVICE} />
          <FooterColumn title="Info" links={INFO} />
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-bk-border pt-6 md:flex-row md:items-center md:justify-between">
          <ul className="flex items-center gap-2">
            {SOCIALS.map(({ href, label, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-bk-border text-bk-fg transition-colors hover:border-bk-fg"
                >
                  <Icon size={18} />
                </a>
              </li>
            ))}
          </ul>

          <p className="text-xs text-bk-muted">
            © {year} Savor by Dee. Made in Shillong.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="md:col-span-2">
      <h2 className="text-sm font-semibold text-bk-fg">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-sm text-bk-muted underline-offset-4 transition-colors hover:text-bk-fg hover:underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
