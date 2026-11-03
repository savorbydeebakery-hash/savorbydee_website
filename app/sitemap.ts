import type { MetadataRoute } from "next";
import { publicSupabase } from "@/lib/site/public-data";
import { SITE_URL, categoryPath } from "@/lib/site/seo";

export const dynamic = "force-dynamic"; // see app/page.tsx: ISR hangs on memoryQueue

const url = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

/**
 * Every page that should be found on Google, from the live menu, so a new
 * category or photo needs no change here. Dates are only given where they are
 * real: Google stops trusting a sitemap whose dates are all "today".
 *
 * Should the menu read fail, the fixed pages are still listed rather than the
 * whole sitemap failing.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = publicSupabase();
  const [items, categories, gallery] = await Promise.all([
    supabase
      .from("menu_items")
      .select("category_id, daily_menu, preorder_menu, image_url, updated_at")
      .eq("is_active", true)
      .then((r) => r.data ?? [], () => []),
    supabase
      .from("categories")
      .select("id, name, updated_at")
      .eq("is_active", true)
      .order("sort_order")
      .then((r) => r.data ?? [], () => []),
    supabase
      .from("gallery_photos")
      .select("image_url")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .then((r) => r.data ?? [], () => []),
  ]);

  const newest = (rows: { updated_at?: string | null }[]) => {
    const times = rows.map((r) => Date.parse(r.updated_at ?? "")).filter(Number.isFinite);
    return times.length ? new Date(Math.max(...times)) : undefined;
  };
  const preorder = items.filter((i) => i.preorder_menu);
  const daily = items.filter((i) => i.daily_menu);
  const dailyPhotos = daily.map((i) => i.image_url).filter((u): u is string => Boolean(u));
  const galleryPhotos = gallery.map((g) => g.image_url as string);

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((c) => preorder.some((i) => i.category_id === c.id))
    .map((c) => ({
      url: url(categoryPath(c.name)),
      lastModified: newest(preorder.filter((i) => i.category_id === c.id)),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/menu"), lastModified: newest(preorder), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/menu/daily"), lastModified: newest(daily), changeFrequency: "daily", priority: 0.9, images: dailyPhotos },
    ...categoryPages,
    { url: url("/custom-cake"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/gallery"), changeFrequency: "weekly", priority: 0.6, images: galleryPhotos },
    ...["contact", "shipping", "refunds", "terms", "privacy"].map((slug) => ({
      url: url(`/policies/${slug}`),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
