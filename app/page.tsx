import { createClient } from "@/lib/supabase/server";
import { PromoBanner } from "@/components/promo-banner";
import { Button } from "@/components/ui/button";
import { HeroCard } from "@/components/ui/hero-card";
import { DailyMenu } from "@/components/daily-menu";
import { GalleryMarquee } from "@/components/gallery-marquee";
import { Reveal } from "@/components/kinetic/reveal";
import { SmartImage } from "@/components/kinetic/smart-image";
import { HomeTiles } from "@/components/home/home-tiles";
import { CurationRow } from "@/components/home/curation-row";
import { BestBakerySection } from "@/components/home/best-bakery-section";
import { ScrollVideoSection } from "@/components/scroll-video-section";
import { TravelingMacaron } from "@/components/three/traveling-macaron";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { PropField } from "@/components/props/prop-field";
import {
  Macaron,
  Cherry,
  ChocolateCurl,
  Sprinkles,
  CakeSlice,
} from "@/components/props/pastry-props";
import Link from "next/link";
import { ArrowRight, Cake } from "lucide-react";

// NOTE: this was briefly `export const revalidate = 60` to avoid seven Supabase
// round-trips to Tokyo per request. That engages OpenNext's ISR path, which
// dispatches background revalidation through the configured queue — and
// open-next.config.ts uses `memoryQueue`, which revalidates inside the same
// worker invocation. The result was:
//
//   Uncaught Error: The Workers runtime canceled this request because it
//   detected that your Worker's code had hung and would never generate a
//   response.
//
// The shell returned 200 but the RSC stream never resolved, so the page
// rendered as a permanent loading skeleton. Reverted until a real queue
// (Cloudflare Queues) is wired up — see REDESIGN_PLAN.md "Deferred".
export const dynamic = "force-dynamic";

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
    { data: specialItems },
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
    supabase
      .from("menu_items")
      .select("id")
      .eq("is_active", true)
      .eq("is_special", true)
      .limit(1),
    supabase.from("site_settings").select("*").eq("id", 1).single(),
  ]);

  // The seasonal section is driven by data, not by a hardcoded date range: it
  // appears when the client flags items as Special in the admin panel and
  // disappears when they unflag them. No code change, and nothing vanishes
  // unexpectedly on a date the client did not choose.
  const hasSpecials = (specialItems?.length ?? 0) > 0;

  const allGalleryPhotos = galleryPhotos ?? [];
  const featuredPhotos = allGalleryPhotos.slice(0, 20);

  const heroImages = [
    ...featuredPhotos.map((p) => p.image_url),
    ...(menuItems ?? []).filter((item) => item.image_url).map((item) => item.image_url!),
  ].slice(0, 7);


  // These were invented: "500+ Happy Customers", "1000+ Custom Cakes
  // Delivered", and a "4.9★" rating that contradicted the 4.7 shown in the
  // Best Bakery section further down the same page. Invented metrics on a real
  // business's site are a liability, not a design flourish. Replaced with
  // things that are actually true and verifiable, rating aligned to 4.7.

  return (
    <div>
      <TravelingMacaron />

      {/* Hero promo banner */}
      <PromoBanner position="homepage_hero" />

      {/* Hero: light card on a live shader field. Layout follows the client's
          reference; palette stays pastel pink. The old centred collage is gone,
          along with the separate CTA row beneath it, since the card carries its
          own calls to action. */}
      <HeroCard images={heroImages} />

      {/* Four big image tiles: Daily / Custom / Full / Specials */}
      {/* Pulled up into the hero's fading field so the two sections share a
          ground instead of butting against each other. */}
      <PropField className="-mt-20 sm:-mt-28">
        <Cherry size={44} x="50%" y="46%" depth={0.5} className="hidden lg:block" />
        <HomeTiles galleryPhotos={featuredPhotos.slice(7, 11)} />
      </PropField>

      {/* Two pinned, scroll-scrubbed sections. Two strong clips beat four
          mixed ones: only two of the four generated clips were usable, and
          padding the sequence with still-only sections would have put warm
          realistic footage next to flat pastel dioramas.

          Both clips were re-encoded with a dense GOP (23 keyframes instead of
          1) via scripts/prep-scroll-video.mjs. Source clips had a single
          keyframe for the whole 8s, so every seek decoded from frame 0 and the
          scrub stuttered. */}
      <ScrollVideoSection
        eyebrow="How it works"
        title="Nothing is baked until you order it"
        body="Every cake, cheesecake and tray of brownies goes into the oven after the order comes in. That is why we ask for notice."
        src="/scroll-world/bakery-arrival.mp4"
        poster="/scroll-world/bakery-arrival.jpg"
        align="left"
      />

      {/* Chef's Choice (admin-curated) — raised band */}
      <PropField className="relative bg-shell">
        <DotPattern
          width={26}
          height={26}
          cr={1.1}
          className="pointer-events-none absolute inset-0 fill-ink/[0.07] [mask-image:radial-gradient(560px_circle_at_center,white,transparent)]"
        />
        <Macaron size={72} x="3%" y="16%" depth={0.45} className="hidden lg:block" />
        <ChocolateCurl size={58} x="94%" y="70%" depth={0.8} className="hidden lg:block" />
        <CurationRow
          eyebrow="Handpicked"
          layout="rail"
          title="Chef's Choice"
          subtitle="The bakes we are proudest of."
          items={chefsChoiceItems ?? []}
          categories={categories ?? []}
        />
      </PropField>

      {/* Most Ordered (admin-curated bestsellers) */}
      <CurationRow
        title="Most Ordered"
        subtitle="The treats our customers keep coming back for."
        items={bestsellerItems ?? []}
        categories={categories ?? []}
      />

      <ScrollVideoSection
        title="Ready when you are"
        body="Choose a pickup slot or have it delivered across Shillong. We box it the way it should arrive."
        src="/scroll-world/bakery-counter.mp4"
        poster="/scroll-world/bakery-counter.jpg"
        align="right"
      />

      {hasSpecials && (
        <ScrollVideoSection
          eyebrow="Seasonal"
          title="Festive bakes, while they last"
          body="Gingerbread, spiced fruit cake and the rest of the seasonal run. Flagged as Specials in the admin panel, so this section appears only while there are any."
          src="/scroll-world/bakery-specials.mp4"
          poster="/scroll-world/bakery-specials.jpg"
          align="center"
          cta="See the specials"
          href="/menu?tag=specials"
          hold="150%"
        />
      )}

      {/* Today's Menu (admin-curated) — raised band */}
      <div className="bg-shell">
        <DailyMenu items={dailyItems ?? []} categories={categories ?? []} />
      </div>

      {/* Infinite gallery marquee — DARK band. Glass and light props read
          against this; it is the page's mid-scroll punctuation. */}
      <PropField className="bg-cocoa">
        {/* Light-toned sprinkles — dark band needs light props. */}
        <Sprinkles size={120} x="6%" y="14%" depth={0.6} tone="light" className="hidden md:block" />
        <Sprinkles size={100} x="86%" y="68%" depth={0.4} tone="light" className="hidden md:block" />
        <GalleryMarquee photos={allGalleryPhotos} />
      </PropField>

      {/* Best Bakery in Shillong — image left, story right */}
      <PropField>
        <CakeSlice size={88} x="92%" y="12%" depth={0.35} className="hidden xl:block" />
        <BestBakerySection
          photo={featuredPhotos[16]?.image_url}
          settings={settings}
        />
      </PropField>

      {/* Custom cake CTA — DARK band with a glass panel. Glass needs something
          behind it to refract; the gradient mesh is that something. */}
      <PropField>
        <section data-contrast-ground="cocoa" className="relative overflow-hidden bg-cocoa px-4 py-20 sm:px-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(60% 80% at 15% 20%, color-mix(in oklab, var(--berry) 40%, transparent), transparent 60%)," +
                "radial-gradient(50% 70% at 85% 30%, rgb(247 216 204 / 0.22), transparent 60%)," +
                "radial-gradient(70% 60% at 50% 100%, rgb(74 56 48 / 0.6), transparent 70%)",
            }}
          />
          <Cherry size={52} x="10%" y="18%" depth={0.5} className="hidden md:block" />
          <Cherry size={38} x="88%" y="70%" depth={0.9} className="hidden md:block" />
          <div className="glass glass-liquid relative mx-auto max-w-3xl rounded-[var(--r-xl)] p-8 text-center sm:p-14">
            <Cake className="mx-auto mb-4 text-blush" size={40} />
            <h2 className="text-h2 mb-4 text-shell">Dreaming of a Custom Cake?</h2>
            <p className="mx-auto mb-8 max-w-lg text-[#D8CCC0]">
              Tell us your vision: flavours, design, decoration. We will craft something
              uniquely yours. Custom cakes need 5 days notice.
            </p>
            <Link href="/custom-cake">
              <Button size="lg" variant="primary">
                Start Your Inquiry <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </section>
      </PropField>

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
                  fit="contain"
                  className="bg-shell"
                />
              </div>
            ))}
          </Reveal>
        </section>
      )}

      {/* How it works. Was three equal cards, which is the single most
          template-looking feature layout there is. Now an asymmetric editorial
          list: oversized outlined numerals in a narrow left rail, copy in a
          wide right column, hairline between steps instead of card chrome. */}
      <Reveal className="relative bg-shell">
        <DotPattern
          width={26}
          height={26}
          cr={1.1}
          className="pointer-events-none absolute inset-0 fill-ink/[0.07] [mask-image:radial-gradient(640px_circle_at_center,white,transparent)]"
        />
        <section className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="text-h2 mb-14 max-w-xl text-ink">
            Three steps, no surprises
          </h2>
          <ol className="divide-y divide-ink/10">
            {[
              { n: "01", title: "Browse and order", desc: "Pick your treats and add them to the cart. Choose sizes, flavours and add-ons as you go." },
              { n: "02", title: "We bake fresh", desc: "Nothing sits on a shelf. Your order goes into the oven after it is placed, which is why we ask for notice." },
              { n: "03", title: "Pickup or delivery", desc: "Choose a slot that works for you. We will have it boxed and ready." },
            ].map((item) => (
              <li
                key={item.n}
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 py-8 sm:grid-cols-[8rem_1fr] sm:gap-x-10"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-[3rem] font-semibold leading-none text-transparent sm:text-[5rem]"
                  style={{ WebkitTextStroke: "1.5px var(--berry)" }}
                >
                  {item.n}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-prose text-ink-soft">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>
    </div>
  );
}
