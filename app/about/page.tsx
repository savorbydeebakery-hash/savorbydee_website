import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, MessageCircle } from "lucide-react";

export const metadata = {
  title: "About Savor by Dee — Our Story",
  description:
    "Learn about Savor by Dee, the artisanal bakery — handcrafted cakes, desserts and savoury bakes made fresh to order in Shillong.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const supabase = await createClient();

  // Fetch gallery photos + site settings
  const [{ data: gallery }, { data: settings }] = await Promise.all([
    supabase
      .from("gallery_photos")
      .select("image_url, caption")
      .eq("is_active", true)
      .order("sort_order")
      .limit(12),
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single(),
  ]);

  const bakeryName = settings?.bakery_name ?? "Savor by Dee";
  const narrative =
    settings?.about_narrative ??
    "Savor by Dee began with a simple love for baking — the warmth of a kitchen, the joy of sharing something made by hand. Every cake, every cookie, every savoury bite is crafted fresh to order, using quality ingredients and a whole lot of heart. From custom celebration cakes to everyday treats, we're here to make your moments a little sweeter.";
  const phone = settings?.contact_phone ?? "+91 98365 37447";
  const whatsapp = settings?.whatsapp_number ?? "919836537447";
  const addressLine1 = settings?.address_line1 ?? "Near Laban Police Station, Myliem";
  const addressCity = settings?.address_city ?? "Shillong, Meghalaya";
  const mapsEmbed = settings?.google_maps_embed_url;
  const mapsDirections = settings?.google_maps_directions_url;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <section className="text-center mb-16">
        <Badge color="pink" className="mb-4">Our Story</Badge>
        <h1 className="text-4xl font-bold text-ink sm:text-5xl mb-6">
          About {bakeryName}
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-ink-soft">
          {narrative}
        </p>
      </section>

      {/* Gallery grid */}
      {gallery && gallery.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-ink mb-6">Gallery</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {gallery.map((photo, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-pink-soft"
              >
                <Image
                  src={photo.image_url}
                  alt={photo.caption ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 276px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/70 to-transparent p-3">
                    <p className="text-xs text-white">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact + Map */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ink">Visit & Contact</h2>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 text-pink" size={20} />
            <div>
              <p className="text-sm text-ink">{addressLine1}</p>
              <p className="text-sm text-ink-soft">{addressCity}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="text-pink" size={20} />
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="text-sm text-ink hover:text-pink transition-colors"
            >
              {phone}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="text-pink" size={20} />
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink hover:text-pink transition-colors"
            >
              WhatsApp us
            </a>
          </div>
          {mapsDirections && (
            <a
              href={mapsDirections}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-medium text-ink hover:bg-mint/90 transition-colors"
            >
              <MapPin size={16} /> Get Directions
            </a>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          {mapsEmbed ? (
            <iframe
              src={mapsEmbed}
              width="100%"
              height="300"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Savor by Dee location"
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center bg-pink-soft">
              <div className="text-center">
                <MapPin className="mx-auto mb-2 text-pink" size={32} />
                <p className="text-sm text-ink-soft">Map will appear here</p>
              </div>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
