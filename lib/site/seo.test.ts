import { describe, it, expect } from "vitest";
import { bakerySchema, breadcrumbSchema, jsonLdHtml, lowestPriceRupees, menuSchema, pageMeta } from "./seo";

const settings = {
  address_line1: "Near Laban Police Station, Myliem",
  address_line2: "Police Bazaar",
  address_city: "Shillong",
  address_state: "Meghalaya",
  contact_phone: "+91 90000 00000",
  instagram_url: "https://www.instagram.com/savorbydee",
  facebook_url: "",
  weekly_hours: {
    monday: { open: true, from: "09:00", to: "21:00" },
    sunday: { open: false, from: "09:00", to: "21:00" },
  },
};

describe("pageMeta", () => {
  it("gives each page its own canonical and a full title", () => {
    const m = pageMeta({ title: "Gallery", description: "d", path: "/gallery" });
    expect(m.alternates?.canonical).toBe("/gallery");
    expect(m.title).toEqual({ absolute: "Gallery | Savor by Dee" });
    expect(m.openGraph?.url).toBe("/gallery");
  });
  it("can use a title as written", () => {
    expect(pageMeta({ title: "T", description: "d", path: "/", absoluteTitle: true }).title).toEqual({ absolute: "T" });
  });
});

describe("bakerySchema", () => {
  it("uses the real address and only the days the shop opens", () => {
    const s = bakerySchema(settings);
    expect(s["@type"]).toBe("Bakery");
    expect(s.address.streetAddress).toBe("Near Laban Police Station, Myliem, Police Bazaar");
    expect(s.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "09:00", closes: "21:00" },
    ]);
  });
  it("leaves out what isn't set instead of guessing", () => {
    const s = bakerySchema({});
    expect(s.telephone).toBeUndefined();
    expect(s.openingHoursSpecification).toBeUndefined();
    expect(s.address.streetAddress).toBeUndefined();
    expect(bakerySchema(settings).sameAs).toEqual(["https://www.instagram.com/savorbydee"]);
  });
  it("claims no rating", () => {
    expect(JSON.stringify(bakerySchema(settings))).not.toContain("aggregateRating");
  });
});

describe("menuSchema", () => {
  const cats = [{ id: "a", name: "Cakes" }, { id: "b", name: "Empty" }];
  const item = { name: " Funfetti ", base_price_cents: 90000, category_id: "a" };

  it("lists real items with rupee prices and drops empty sections", () => {
    const s = menuSchema("Preorder Menu", "/menu", cats, [item]);
    expect(s.hasMenuSection).toHaveLength(1);
    const first = s.hasMenuSection[0].hasMenuItem[0];
    expect(first.name).toBe("Funfetti");
    expect(first.offers).toMatchObject({ price: 900, priceCurrency: "INR", availability: "https://schema.org/InStock" });
    expect(first.image).toBeUndefined();
  });
  it("marks a sold-out item out of stock", () => {
    const s = menuSchema("M", "/m", cats, [{ ...item, is_sold_out: true }]);
    expect(s.hasMenuSection[0].hasMenuItem[0].offers.availability).toContain("OutOfStock");
  });
  it("prices a weighed item from its smallest weight", () => {
    expect(lowestPriceRupees({ ...item, price_model: "weight_tiers", price_options: [{ price: 180000 }, { price: 44000 }] })).toBe(440);
    expect(lowestPriceRupees({ ...item, price_model: "flat", price_options: [{ price: 44000 }] })).toBe(900);
  });
});

describe("the rest", () => {
  it("numbers breadcrumbs from 1, with full addresses", () => {
    const b = breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Menu", path: "/menu" }]);
    expect(b.itemListElement[0]).toMatchObject({ position: 1, item: "https://savorbydee.in" });
    expect(b.itemListElement[1]).toMatchObject({ position: 2, item: "https://savorbydee.in/menu" });
  });
  it("can't be broken out of its script tag", () => {
    expect(jsonLdHtml({ name: "</script><script>x" })).not.toContain("</script>");
  });
});
