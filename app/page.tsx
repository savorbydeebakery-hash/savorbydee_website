import { createClient } from "@/lib/supabase/server";
import { PromoBanner } from "@/components/promo-banner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyMenu } from "@/components/daily-menu";
import { GalleryMarquee } from "@/components/gallery-marquee";
import Link from "next/link";
import { ArrowRight, Cake, Cookie, Coffee, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch daily-menu items (full cart fields for the add-to-cart modal)
  const [{ data: dailyItems }, { data: categories }, { data: galleryPhotos }] =
    await Promise.all([
      supabase
        .from("menu_items")
        .select(
          "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, requires_custom_notice, daily_menu"
        )
        .eq("is_active", true)
        .eq("daily_menu", true)
        .order("sort_order"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("gallery_photos")
        .select("id, image_url, caption")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  return (
    <div>
      {/* Hero promo banner */}
      <PromoBanner position="homepage_hero" />

      {/* Fallback hero if no banner */}
      <section className="bg-gradient-to-br from-pink-soft via-white to-lavender-soft px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Badge color="pink" className="mb-4">Handcrafted in Kolkata</Badge>
          <h1 className="text-4xl font-bold text-ink sm:text-6xl mb-4">
            Cakes & Desserts
            <br />
            <span className="text-pink">Made Fresh to Order</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-ink-soft mb-8">
            From celebration cakes to everyday treats — every bake is crafted
            with quality ingredients and a whole lot of heart.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
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
        </div>
      </section>

      {/* Category quick links */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {categories.map((cat, i) => {
              const icons = [Cake, Cookie, Coffee, Cake, Cookie, Coffee];
              const Icon = icons[i % icons.length];
              const colors = [
                "bg-pink-soft text-pink",
                "bg-mint-soft text-mint",
                "bg-lavender-soft text-lavender",
                "bg-peach-soft text-peach",
                "bg-sky-soft text-sky",
                "bg-yellow-soft text-yellow",
              ];
              return (
                <Link key={cat.id} href={`/menu?category=${cat.id}`}>
                  <Card hover className="flex items-center gap-3 py-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[i % colors.length]}`}>
                      <Icon size={20} />
                    </div>
                    <span className="font-medium text-ink">{cat.name}</span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Today's Menu (admin-curated) */}
      <DailyMenu items={dailyItems ?? []} categories={categories ?? []} />

      {/* Infinite gallery marquee */}
      <GalleryMarquee photos={galleryPhotos ?? []} />

      {/* Custom cake CTA */}
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

      {/* How it works */}
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
    </div>
  );
}
