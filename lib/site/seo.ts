import type { Metadata } from "next";
import { categorySlug } from "@/lib/menu/category-slug";

/**
 * What search engines read: page titles, canonical addresses and structured
 * data, in one place so no page can drift from the rest.
 *
 * Every fact here comes from Settings or the menu. Nothing is marked up that a
 * customer can't see on the page, and no rating is claimed: the Google and
 * Swiggy scores on the homepage belong to those sites, and Google ignores (and
 * can penalise) ratings a business publishes about itself.
 */

export const SITE_URL = "https://savorbydee.in";
export const SITE_NAME = "Savor by Dee";

const OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Cakes and bakes from Savor by Dee, a bakery in Shillong",
};

/**
 * A page's metadata. Set on each page rather than the root layout, because a
 * canonical in the layout would be inherited by every page and tell Google they
 * are all copies of the homepage.
 */
export function pageMeta({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  /** The whole title as written, without " | Savor by Dee" added. */
  absoluteTitle?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_IN",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/** Safe inside a <script>: a "<" in a cake's name can't close the tag. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: unknown) => (typeof s === "string" && s.trim() ? s.trim() : undefined);

type Settings = Record<string, unknown> | null | undefined;

/**
 * The bakery, for Google's business results. Empty settings are left out rather
 * than guessed: a wrong address or phone number does more harm than none.
 */
export function bakerySchema(settings: Settings) {
  const street = [clean(settings?.address_line1), clean(settings?.address_line2)].filter(Boolean).join(", ");
  const hours = (settings?.weekly_hours ?? {}) as Record<string, { open?: boolean; from?: string; to?: string } | undefined>;
  const sameAs = [clean(settings?.instagram_url), clean(settings?.facebook_url)].filter(Boolean);
  const hasHours = DAYS.some((d) => hours[d]?.open);

  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": `${SITE_URL}/#bakery`,
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}${OG_IMAGE.url}`,
    logo: `${SITE_URL}/staff-icon-512.png`,
    description: "Handcrafted cakes, custom cakes, desserts, cookies and savoury bakes, made fresh to order in Shillong.",
    telephone: clean(settings?.contact_phone),
    email: clean(settings?.contact_email),
    address: {
      "@type": "PostalAddress",
      streetAddress: street || undefined,
      addressLocality: clean(settings?.address_city) ?? "Shillong",
      addressRegion: clean(settings?.address_state) ?? "Meghalaya",
      addressCountry: "IN",
    },
    hasMap: clean(settings?.google_maps_directions_url),
    sameAs: sameAs.length ? sameAs : undefined,
    openingHoursSpecification: hasHours
      ? DAYS.filter((d) => hours[d]?.open).map((d) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: titleCase(d),
          opens: hours[d]?.from,
          closes: hours[d]?.to,
        }))
      : undefined,
    servesCuisine: "Bakery",
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Cash",
    areaServed: { "@type": "City", name: "Shillong" },
    hasMenu: `${SITE_URL}/menu`,
  };
}

/** Helps Google show "Savor by Dee" as the site's name in results. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#bakery` },
  };
}

export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path === "/" ? "" : c.path}`,
    })),
  };
}

export interface SchemaMenuItem {
  name: string;
  description?: string | null;
  image_url?: string | null;
  base_price_cents: number;
  price_model?: string | null;
  price_options?: { price?: number | null }[] | null;
  is_sold_out?: boolean | null;
  stock_count?: number | null;
  category_id?: string | null;
}

/** The lowest price a customer can pay: the smallest weight, or the base price. */
export function lowestPriceRupees(item: SchemaMenuItem): number {
  const tiers =
    item.price_model === "weight_tiers"
      ? (item.price_options ?? []).map((o) => o.price).filter((p): p is number => typeof p === "number" && p > 0)
      : [];
  return (tiers.length ? Math.min(...tiers) : item.base_price_cents) / 100;
}

function menuItemSchema(item: SchemaMenuItem) {
  const unavailable = item.is_sold_out || item.stock_count === 0;
  return {
    "@type": "MenuItem",
    name: item.name.trim(),
    description: clean(item.description),
    image: clean(item.image_url),
    offers: {
      "@type": "Offer",
      price: lowestPriceRupees(item),
      priceCurrency: "INR",
      availability: `https://schema.org/${unavailable ? "OutOfStock" : "InStock"}`,
    },
  };
}

/** A menu with its sections and prices. Empty sections are left out. */
export function menuSchema(
  name: string,
  path: string,
  categories: { id: string; name: string }[],
  items: SchemaMenuItem[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name,
    url: `${SITE_URL}${path}`,
    inLanguage: "en-IN",
    hasMenuSection: categories
      .map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: items.filter((i) => i.category_id === c.id).map(menuItemSchema),
      }))
      .filter((s) => s.hasMenuItem.length > 0),
  };
}

/** The Preorder Menu's own page for a category, e.g. /menu/cheesecakes. */
export const categoryPath = (name: string) => `/menu/${categorySlug(name)}`;
