import { createClient } from "@/lib/supabase/server";
import { PromoBanner } from "@/components/promo-banner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeroCollage } from "@/components/ui/modern-hero-section";
import { DailyMenu } from "@/components/daily-menu";
import { GalleryMarquee } from "@/components/gallery-marquee";
import { Reveal } from "@/components/kinetic/reveal";
import { SmartImage } from "@/components/kinetic/smart-image";
import { HomeTiles } from "@/components/home/home-tiles";
import { CurationRow } from "@/components/home/curation-row";
import { BestBakerySection } from "@/components/home/best-bakery-section";
import Link from "next/link";
import { ArrowRight, Cake, ShoppingBag } from "lucide-react";

// ISR via the KV incremental cache (NEXT_INC_CACHE_KV, see wrangler.jsonc).
// Was force-dynamic, which meant seven Supabase round-trips to Tokyo on every
// single request. 60s is fresh enough for the sold-out toggle, which is
// re-validated server-side at checkout regardless.
export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const SELECT_FIELDS =
    "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, requires_custom_notice, daily_menu, is_special, is_chefs_choice, is_bestseller";

  const [
    { data: dailyItems },
    { data: categories },
    { data: galleryPhotos },
    { data: menuItems },
    { data: chefsChoiceItems },
    { data: bestsellerItems },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("menu_items")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .eq("daily_menu", true)
      .order("sort_order"),
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
    // Bounded deliberately: this query had no limit and fed a 3x-duplicated
    // marquee, so ~100 gallery rows became ~300 image slots on the homepage.
    // The page only ever indexes up to featuredPhotos[16].
    supabase
      .from("gallery_photos")
      .select("id, image_url, caption")
      .eq("is_active", true)
      .order("sort_order")
      .limit(24),
    // Only used to harvest image_url for the hero collage (needs 7).
    supabase
      .from("menu_items")
      .select("id, name, image_url")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .order("sort_order")
      .limit(12),
    supabase
      .from("menu_items")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .eq("is_chefs_choice", true)
      .order("sort_order")
      .limit(6),
    supabase
      .from("menu_items")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .eq("is_bestseller", true)
      .order("sort_order")
      .limit(6),
    supabase.from("site_settings").select("*").eq("id", 1).single(),
  ]);

  const allGalleryPhotos = galleryPhotos ?? [];
  const featuredPhotos = allGalleryPhotos.slice(0, 20);

  const heroImages = [
    ...featuredPhotos.map((p) => p.image_url),
    ...(menuItems ?? []).filter((item) => item.image_url).map((item) => item.image_url!),
  ].slice(0, 7);

  const heroBackground = featuredPhotos[11]?.image_url ?? featuredPhotos[0]?.image_url;

  const stats = [
    { value: "500+", label: "Happy Customers" },
    { value: "1000+", label: "Custom Cakes Delivered" },
    { value: "4.9★", label: "Customer Rating" },
  ];

  return (
    <div>
      {/* Hero promo banner */}
      <PromoBanner position="homepage_hero" />

      {/* Hero — floating image collage */}
      <HeroCollage
        title={
          <>
            Cakes & Desserts{" "}
            <span className="text-pink">Made Fresh to Order</span>
          </>
        }
        subtitle="From celebration cakes to everyday treats — every bake is crafted with quality ingredients and a whole lot of heart. Handcrafted in Shillong."
        stats={stats}
        images={heroImages}
        backgroundImage={heroBackground}
      />

      {/* CTA buttons */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap justify-center gap-3 -mt-8 relative z-10">
          <Link href="/menu">
            <Button size="lg" variant="primary">
              <ShoppingBag size={18} /> Browse Menu
            </Button>
          </Link>
          <Link href="/custom-cake">
            <Button size="lg" variant="outline">
              <Cake size={18} /> Custom Cake Inquiry
            </Button>
          </Link>
        </div>
      </section>

      {/* Four big image tiles: Daily / Custom / Full / Specials */}
      <HomeTiles galleryPhotos={featuredPhotos.slice(7, 11)} />

      {/* Chef's Choice (admin-curated) */}
      <CurationRow
        title="Chef's Choice"
        subtitle="Handpicked by our bakers — the bakes we're proudest of."
        items={chefsChoiceItems ?? []}
        categories={categories ?? []}
      />

      {/* Most Ordered (admin-curated bestsellers) */}
      <CurationRow
        title="Most Ordered"
        subtitle="The treats our customers keep coming back for."
        items={bestsellerItems ?? []}
        categories={categories ?? []}
      />

      {/* Today's Menu (admin-curated) */}
      <DailyMenu items={dailyItems ?? []} categories={categories ?? []} />

      {/* Infinite gallery marquee */}
      <GalleryMarquee photos={allGalleryPhotos} />

      {/* Best Bakery in Shillong — image left, story right */}
      <BestBakerySection
        photo={featuredPhotos[16]?.image_url}
        settings={settings}
      />

      {/* Custom cake CTA */}
      <Reveal>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-lavender-soft to-pink-soft p-8 sm:p-12 text-center">
            <Cake className="mx-auto mb-4 text-lavender" size={40} />
            <h2 className="text-2xl font-bold text-ink sm:text-3xl mb-3">
              Dreaming of a Custom Cake?
            </h2>
            <p className="mx-auto max-w-lg text-ink-soft mb-6">
              Tell us your vision — flavors, design, decoration — and we&rsquo;ll craft
              something uniquely yours. Custom cakes need 5 days notice.
            </p>
            <Link href="/custom-cake">
              <Button size="lg" variant="secondary">
                Start Your Inquiry <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </section>
      </Reveal>

      {/* Scattered image strip (from gallery, for the "image everywhere" feel) */}
      {featuredPhotos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Reveal className="scattered-strip">
            {featuredPhotos.slice(12, 17).map((photo, i) => (
              <div key={photo.id} className={`tile ${i < 4 ? "" : "hidden sm:block"}`}>
                <SmartImage
                  src={photo.image_url}
                  alt={photo.caption ?? "SAVOR bakery"}
                  aspect="aspect-[4/3]"
                  sizes="(max-width: 640px) 50vw, 300px"
                />
              </div>
            ))}
          </Reveal>
        </section>
      )}

      {/* How it works */}
      <Reveal>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-ink mb-8">How It Works</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { step: "01", title: "Browse & Order", desc: "Pick your treats from our menu and add to cart.", color: "bg-pink-soft text-pink" },
              { step: "02", title: "We Bake Fresh", desc: "Everything is made to order — no stale shelf stock.", color: "bg-mint-soft text-mint" },
              { step: "03", title: "Pickup or Delivery", desc: "Choose a slot that works for you. We'll have it ready.", color: "bg-lavender-soft text-lavender" },
            ].map((item) => (
              <Card key={item.step} className="text-center">
                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${item.color} text-lg font-bold`}>
                  {item.step}
                </div>
                <h3 className="font-semibold text-ink mb-1">{item.title}</h3>
                <p className="text-sm text-ink-soft">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
