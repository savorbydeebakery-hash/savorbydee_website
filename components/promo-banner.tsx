import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

/**
 * Promotional banner display system.
 * Fetches active banners from Supabase and renders them based on position.
 * Positions: homepage_hero, menu_top, site_wide_strip
 */
export async function PromoBanner({
  position,
}: {
  position: "homepage_hero" | "menu_top" | "site_wide_strip";
}) {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const { data: banners } = await supabase
    .from("promo_banners")
    .select("*")
    .eq("is_active", true)
    .eq("position", position)
    .or(`end_date.is.null,end_date.gt.${now}`)
    .lte("start_date", now)
    .order("sort_order")
    .limit(1);

  const banner = banners?.[0];
  if (!banner) return null;

  // Site-wide strip: minimal banner
  if (position === "site_wide_strip") {
    return (
      <div className="bg-berry px-4 py-2 text-center">
        <p className="text-sm font-medium text-white">
          {banner.title}
          {banner.cta_text && banner.cta_link && (
            <a
              href={banner.cta_link}
              className="ml-2 underline underline-offset-2 hover:no-underline"
            >
              {banner.cta_text} →
            </a>
          )}
        </p>
      </div>
    );
  }

  // Menu top: compact banner
  if (position === "menu_top") {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-lavender-soft border border-lavender/20 px-6 py-4">
          <div>
            <h3 className="font-semibold text-ink">{banner.title}</h3>
            {banner.body_text && (
              <p className="text-sm text-ink-soft mt-0.5">{banner.body_text}</p>
            )}
          </div>
          {banner.cta_text && banner.cta_link && (
            <a
              href={banner.cta_link}
              className="whitespace-nowrap rounded-xl bg-lavender px-4 py-2 text-sm font-medium text-ink hover:bg-lavender/90 transition-colors"
            >
              {banner.cta_text}
            </a>
          )}
        </div>
      </div>
    );
  }

  // Homepage hero: full-width banner with optional poster image
  return (
    <section className="relative overflow-hidden">
      {banner.poster_image_url ? (
        <div className="relative h-[400px] sm:h-[500px]">
          <Image
            src={banner.poster_image_url}
            alt={banner.title}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="mx-auto max-w-6xl">
              <Badge color="pink" className="mb-3">Featured</Badge>
              <h2 className="text-3xl font-bold text-white sm:text-4xl mb-2">
                {banner.title}
              </h2>
              {banner.body_text && (
                <p className="text-lg text-white/90 max-w-xl mb-4">
                  {banner.body_text}
                </p>
              )}
              {banner.cta_text && banner.cta_link && (
                <a
                  href={banner.cta_link}
                  className="inline-flex items-center gap-2 rounded-xl bg-berry px-6 py-3 text-sm font-semibold text-white hover:bg-berry/90 transition-colors"
                >
                  {banner.cta_text} →
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-pink-soft via-lavender-soft to-mint-soft px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <Badge color="pink" className="mb-4">Featured</Badge>
            <h2 className="text-h2 text-ink mb-3">
              {banner.title}
            </h2>
            {banner.body_text && (
              <p className="text-lg text-ink-soft max-w-xl mx-auto mb-6">
                {banner.body_text}
              </p>
            )}
            {banner.cta_text && banner.cta_link && (
              <a
                href={banner.cta_link}
                className="inline-flex items-center gap-2 rounded-xl bg-berry px-6 py-3 text-sm font-semibold text-white hover:bg-berry/90 transition-colors"
              >
                {banner.cta_text} →
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
