import { JsonLd } from "@/components/site/json-ld";
import { bakerySchema, pageMeta } from "@/lib/site/seo";
import { getSiteSettings } from "@/lib/site/public-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import { ABOUT_INTRO, ABOUT_SECTIONS, OFFERINGS, PHILOSOPHY, CLOSING } from "@/lib/site/about-copy";

export const metadata = pageMeta({
  title: "About Us: A Bakery in Shillong",
  description:
    "Meet Savor by Dee, a bakery near Police Bazaar in Shillong making handcrafted cakes, desserts and savoury bakes, fresh to order. Find our address and hours.",
  path: "/about",
});

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getSiteSettings();

  const bakeryName = settings?.bakery_name ?? "Savor by Dee";
  // `||`, not `??`: the column defaults to an empty string, and `??` let that
  // through, so the intro rendered as a blank paragraph.
  const narrative = (settings?.about_narrative as string | null | undefined)?.trim() || ABOUT_INTRO;
  const phone = settings?.contact_phone ?? "+91 98365 37447";
  const whatsapp = settings?.whatsapp_number ?? "919836537447";
  const addressLine1 = settings?.address_line1 ?? "Near Laban Police Station, Myliem";
  const addressCity = settings?.address_city ?? "Shillong, Meghalaya";
  const mapsDirections = settings?.google_maps_directions_url;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <JsonLd data={bakerySchema(settings)} />
      {/* Hero */}
      <section className="text-center mb-16">
        <Badge color="pink" className="mb-4">Our Story</Badge>
        <h1 className="text-h1 text-ink mb-6">
          About {bakeryName}
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-ink-soft">
          {narrative}
        </p>
      </section>

      {/* The story, in short sections a visitor can scan. */}
      <section className="mx-auto mb-16 grid max-w-4xl gap-10 md:grid-cols-3 md:gap-8">
        {ABOUT_SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-center mb-3 text-xl font-semibold text-ink">{s.title}</h2>
            <p className="text-center leading-relaxed text-ink-soft">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mb-16 max-w-4xl">
        <h2 className="text-center text-h2 text-ink mb-6">Our Offerings</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            // Today's Menu timing from Settings (client, 2026-11-01).
            `Today’s Menu, baked each morning: ready to collect ${(settings as { daily_pickup_notice_minutes?: number | null } | null)?.daily_pickup_notice_minutes ?? 10} minutes after you order`,
            ...OFFERINGS,
          ].map((item) => (
            <li
              key={item}
              className="rounded-2xl bg-pink-soft px-5 py-4 text-center text-ink"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mb-16 max-w-3xl rounded-3xl bg-lavender-soft px-6 py-10 text-center sm:px-12">
        <h2 className="text-center text-h2 text-ink mb-4">Our Philosophy</h2>
        <p className="leading-relaxed text-ink-soft">{PHILOSOPHY}</p>
        <p className="mt-6 text-lg font-medium leading-relaxed text-ink">{CLOSING}</p>
      </section>

      {/* Contact. The map beside it is gone on the client's instruction —
          no embed was ever configured, so it rendered a pink box reading "Map
          will appear here" to every visitor. Get Directions still opens the
          real Google Maps link, which is the part a customer actually uses. */}
      <section className="mx-auto max-w-xl">
        <Card className="flex flex-col gap-4">
          <h2 className="text-center text-xl font-semibold text-ink">Visit & Contact</h2>
          <div className="flex items-start justify-center gap-3">
            <MapPin className="mt-0.5 shrink-0 text-berry" size={20} />
            <div className="text-center">
              <p className="text-sm text-ink">{addressLine1}</p>
              <p className="text-sm text-ink-soft">{addressCity}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Phone className="text-berry" size={20} />
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="text-sm text-ink hover:text-berry transition-colors"
            >
              {phone}
            </a>
          </div>
          <div className="flex items-center justify-center gap-3">
            <MessageCircle className="text-berry" size={20} />
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink hover:text-berry transition-colors"
            >
              WhatsApp us
            </a>
          </div>
          {mapsDirections && (
            <a
              href={mapsDirections}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-medium text-ink hover:bg-mint/90 transition-colors"
            >
              <MapPin size={16} /> Get Directions
            </a>
          )}
        </Card>

      </section>
    </div>
  );
}
