"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Search } from "lucide-react";
import { formatPrice } from "@/lib/cart/math";
import { filterMenuItems } from "@/lib/admin/menu-filter";
import { planStockSave } from "@/lib/admin/stock-drafts";
import { describeWriteError } from "@/lib/admin/write-error";

export const dynamic = "force-dynamic";

interface DailyItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  daily_menu: boolean;
  base_price_cents: number;
  stock_count: number | null;
  is_sold_out: boolean;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

/**
 * Today's Stock — the morning's counts in one place.
 *
 * Every daily item has to be counted each morning, and the only way to do it
 * was to open forty-five items one at a time on the Menu Items page. Here each
 * item is a single box: type what came out of the oven and press Save once.
 *
 * The save is one database call (set_stock_counts, migration 00041), so it is
 * all or nothing. A dropped connection at item thirty cannot leave the menu
 * half on today's counts and half on yesterday's.
 *
 * A blank box is left alone rather than untracked — the storefront treats no
 * count as unlimited, so a stray backspace must not let customers order a cake
 * that was never baked. See lib/admin/stock-drafts.ts.
 */
export default function AdminStockPage() {
  const supabase = createClient();
  const [items, setItems] = useState<DailyItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [{ data: itemData, error: itemError }, { data: catData }] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id, name, description, category_id, daily_menu, base_price_cents, stock_count, is_sold_out")
        .eq("daily_menu", true)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("categories").select("id, name, sort_order").order("sort_order"),
    ]);
    if (itemError) setError(describeWriteError(itemError, "today's menu"));
    const rows = (itemData as DailyItem[]) ?? [];
    setItems(rows);
    setCategories((catData as Category[]) ?? []);
    // Boxes start on the current count, so the screen shows what is there now
    // and only the numbers someone changes are sent.
    setDrafts(Object.fromEntries(rows.map((r) => [r.id, r.stock_count?.toString() ?? ""])));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const plan = useMemo(() => planStockSave(items, drafts), [items, drafts]);
  const dirty = plan.lines.length > 0;

  // Leaving mid-count would throw away a morning's typing without a word.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const visible = useMemo(
    () => filterMenuItems(items, { query, category: "all", menu: "daily" }),
    [items, query]
  );

  const groups = useMemo(() => {
    const byCategory = new Map<string, DailyItem[]>();
    for (const item of visible) {
      const key = item.category_id ?? "none";
      byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
    }
    const ordered = categories
      .filter((c) => byCategory.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, items: byCategory.get(c.id)! }));
    if (byCategory.has("none")) {
      ordered.push({ id: "none", name: "Uncategorized", items: byCategory.get("none")! });
    }
    return ordered;
  }, [visible, categories]);

  const save = async () => {
    setError(null);
    setSavedCount(null);
    if (plan.invalid.length > 0) {
      setError(
        `Fix these first — a count has to be a whole number, 0 or more: ${plan.invalid.join(", ")}.`
      );
      return;
    }
    if (!dirty) return;

    setSaving(true);
    const { error: rpcError } = await supabase.rpc("set_stock_counts", { lines: plan.lines });
    setSaving(false);

    if (rpcError) {
      // Nothing was saved — the whole batch rolls back together.
      setError(`${describeWriteError(rpcError, "today's counts")} No counts were changed.`);
      return;
    }
    setSavedCount(plan.lines.length);
    await load();
  };

  const setAll = (value: string) => {
    setSavedCount(null);
    setDrafts(Object.fromEntries(items.map((i) => [i.id, value])));
  };

  if (loading) return <div className="py-20 text-center text-ink-soft">Loading today&apos;s menu...</div>;

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-ink">Today&apos;s Stock</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Type how many of each came out today and press Save once. Orders take from
          these counts automatically. An item at 0 shows as sold out.
        </p>
      </div>

      <div className="my-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an item"
            aria-label="Find an item"
            className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20"
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm("Set every item on today's menu to 0? Nothing is saved until you press Save.")) {
              setAll("0");
            }
          }}
        >
          Set all to 0
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {savedCount !== null && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-mint-soft px-4 py-3 text-sm text-ink">
          <Check size={16} /> Saved {savedCount} count{savedCount === 1 ? "" : "s"}.
        </p>
      )}

      {items.length === 0 ? (
        <Card className="py-12 text-center text-sm text-ink-soft">
          Nothing is on today&apos;s menu. Mark items as &ldquo;On Today&apos;s Menu&rdquo; in Menu Items.
        </Card>
      ) : groups.length === 0 ? (
        <Card className="py-12 text-center text-sm text-ink-soft">No item matches that search.</Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <Card key={group.id} className="p-0">
              <h2 className="border-b border-ink/10 px-4 py-3 text-sm font-semibold text-ink">
                {group.name}
              </h2>
              <ul>
                {group.items.map((item) => {
                  const draft = drafts[item.id] ?? "";
                  const changed = plan.lines.some((l) => l.id === item.id);
                  const bad = plan.invalid.includes(item.name);
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between gap-3 border-b border-ink/5 px-4 py-2.5 last:border-b-0 ${
                        changed ? "bg-yellow-soft/40" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                        <p className="text-xs text-ink-faint">
                          {formatPrice(item.base_price_cents)}
                          {item.stock_count !== null && <> &middot; now {item.stock_count}</>}
                          {item.stock_count === null && <> &middot; not counted</>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.is_sold_out && <Badge color="neutral">Marked sold out</Badge>}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draft}
                          onChange={(e) => {
                            setSavedCount(null);
                            setDrafts((d) => ({ ...d, [item.id]: e.target.value }));
                          }}
                          aria-label={`Stock for ${item.name}`}
                          aria-invalid={bad}
                          className={`w-20 rounded-xl border bg-white px-3 py-2 text-right text-sm tabular-nums text-ink focus:outline-none focus:ring-2 ${
                            bad
                              ? "border-red-400 focus:ring-red-400/20"
                              : "border-ink/15 focus:border-pink focus:ring-pink/20"
                          }`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Save stays in reach at the bottom of a long list, on a phone above all. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 px-4 py-3 backdrop-blur lg:pl-64">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {plan.invalid.length > 0
              ? `${plan.invalid.length} ${plan.invalid.length === 1 ? "box needs" : "boxes need"} fixing`
              : dirty
                ? `${plan.lines.length} change${plan.lines.length === 1 ? "" : "s"} not saved`
                : "All counts saved"}
          </p>
          <Button
            variant="primary"
            onClick={save}
            disabled={saving || (!dirty && plan.invalid.length === 0)}
          >
            {saving ? "Saving..." : "Save counts"}
          </Button>
        </div>
      </div>
    </div>
  );
}
