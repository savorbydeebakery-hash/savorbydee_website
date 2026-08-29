"use client";

import Link from "next/link";
import { Star, Clock, MapPin, Award, Cake } from "lucide-react";
import { Reveal } from "@/components/kinetic/reveal";
import { SmartImage } from "@/components/kinetic/smart-image";

interface Settings {
  about_narrative?: string | null;
  contact_phone?: string | null;
  address_city?: string | null;
  address_line1?: string | null;
  google_maps_directions_url?: string | null;
}

interface BestBakerySectionProps {
  photo?: string;
  settings: Settings | null;
}

/**
 * "Best Bakery in Shillong" — cinematic image on the LEFT, story + stats
 * on the RIGHT. Uses real bakery data (Google rating, hours, address).
 */
export function BestBakerySection({ photo, settings }: BestBakerySectionProps) {
  const narrative =
    settings?.about_narrative ??
    "Savor by Dee began with a simple love for baking: the warmth of a kitchen, the joy of sharing something made by hand. Every cake, every cookie, every savoury bite is made fresh to order.";
  const directions =
    settings?.google_maps_directions_url ?? "https://maps.app.goo.gl/UTshwMiCXrRDXPW67";

  // Icon foregrounds come from the ink/berry/cocoa ramp — the pale tokens are
  // surfaces and were previously invisible when used as the icon colour.
  const stats = [
    { icon: Star, text: "4.7/5 on Google", accent: "bg-yellow-soft text-gold-deep" },
    { icon: Clock, text: "Open Mon-Sat, 9am to 9pm", accent: "bg-mint-soft text-cocoa" },
    { icon: MapPin, text: "Near Laban, Shillong", accent: "bg-pink-soft text-berry" },
    { icon: Award, text: "Made fresh to order", accent: "bg-lavender-soft text-cocoa" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
        {/* Image — LEFT */}
        <div className="relative">
          <div className="overflow-hidden rounded-[var(--r-xl)]">
            <SmartImage
              src={photo}
              alt="Savor by Dee bakery"
              aspect="aspect-[4/3]"
              sizes="(max-width: 768px) 100vw, 560px"
              fit="contain"
              className="rounded-[var(--r-xl)] bg-shell"
            />
          </div>
          {/* Glass, overlapping the image corner — glass over imagery is the
              placement rule's happy path. */}
          <div data-contrast-ground="cocoa" className="glass glass-liquid absolute -bottom-5 -right-3 hidden rounded-[var(--r-md)] p-4 sm:block">
            <p className="font-display text-3xl font-bold text-white">4.7</p>
            <div className="flex items-center gap-0.5 text-blush">
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" className="opacity-40" />
            </div>
            <p className="text-xs text-[#D8CCC0]">Google rating</p>
          </div>
        </div>

        {/* Story — RIGHT */}
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-berry/10 px-3 py-1 text-eyebrow text-berry">
            <Cake size={12} /> Artisanal Bakery
          </p>
          <h2 className="text-h2 text-ink mb-4">
            Best Bakery in Shillong
          </h2>
          <p className="text-ink-soft leading-relaxed mb-6">{narrative}</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
            {stats.map((s) => (
              <div key={s.text} className="flex items-center gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${s.accent}`}>
                  <s.icon size={18} />
                </div>
                <span className="text-sm font-medium text-ink">{s.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-cocoa px-5 py-2.5 text-sm font-semibold text-shell transition-colors hover:bg-cocoa-soft"
            >
              <MapPin size={16} /> Get Directions
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-porcelain px-5 py-2.5 text-sm font-semibold text-ink hover:border-berry hover:text-berry transition-colors"
            >
              Our Story
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}