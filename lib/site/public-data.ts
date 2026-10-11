import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public, read-only data for the storefront, fetched ONCE per page request.
 *
 * WHY THIS EXISTS
 * The site runs on Cloudflare Workers, which caps the CPU each request may
 * use. On 2026-10-11 the live site was intermittently answering with
 * "Error 1102 — Worker exceeded resource limits". Every page was doing more
 * than it needed to:
 *
 *   - site_settings was read three times per request (root layout, footer,
 *     and the page itself), plus a promo-banner query from the layout and
 *     another from the page;
 *   - each of those built its own cookie-aware Supabase client, so a single
 *     page constructed four or five clients to read data that is the same for
 *     every visitor.
 *
 * `cache()` from React de-duplicates within one server render: the layout,
 * the footer and the page all call getSiteSettings() and exactly one query
 * runs. It does NOT cache across requests — an edit in the admin panel is
 * visible on the very next page load, as before.
 *
 * The client here is the anon key with no session. Everything read through it
 * is world-readable under RLS (settings, active menu items, gallery, reviews,
 * banners), and using it means a signed-in visitor's cookies are never needed
 * to render a public page. Anything that depends on WHO is asking must keep
 * using lib/supabase/server.ts.
 */

let anonClient: SupabaseClient | null = null;

/** One anon client per isolate, created on first use (never at module load). */
export function publicSupabase(): SupabaseClient {
  anonClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
  return anonClient;
}

/**
 * The single site_settings row. Columns are added by migrations and read by
 * name all over the storefront, so this stays loosely typed, exactly as the
 * untyped Supabase client returned it before.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped row, read by column name
export type SiteSettings = Record<string, any>;

/**
 * Null when the read fails. Every caller already treats a missing setting as
 * "use the shipped default" — a settings hiccup must not take a page down.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings | null> => {
  try {
    const { data } = await publicSupabase().from("site_settings").select("*").eq("id", 1).single();
    return (data as SiteSettings | null) ?? null;
  } catch {
    return null;
  }
});

export interface ActiveBanner {
  id: string;
  title: string;
  body_text: string | null;
  cta_text: string | null;
  cta_link: string | null;
  poster_image_url: string | null;
  position: "homepage_hero" | "menu_top" | "site_wide_strip";
  sort_order: number;
}

/**
 * Every banner that is live right now, in display order — one query for all
 * three positions, where each <PromoBanner> used to run its own.
 */
export const getActiveBanners = cache(async (): Promise<ActiveBanner[]> => {
  try {
    const now = new Date().toISOString();
    const { data } = await publicSupabase()
      .from("promo_banners")
      .select("id, title, body_text, cta_text, cta_link, poster_image_url, position, sort_order")
      .eq("is_active", true)
      .or(`end_date.is.null,end_date.gt.${now}`)
      .lte("start_date", now)
      .order("sort_order");
    return (data as ActiveBanner[] | null) ?? [];
  } catch {
    return [];
  }
});
