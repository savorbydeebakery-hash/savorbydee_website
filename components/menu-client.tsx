"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MenuItemCard } from "@/components/menu-item-card";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { RevealGroup, RevealItem } from "@/components/kinetic/reveal";
import type { MenuItemForCart } from "@/lib/cart/types";

interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface MenuClientProps {
  categories: MenuCategory[];
  menuItems: MenuItemForCart[];
  tag?: string;
}

const tagTitles: Record<string, string> = {
  daily: "Today's Menu",
  specials: "Specials",
  "chefs-choice": "Chef's Choice",
  bestseller: "Most Ordered",
};

export function MenuClient({ categories, menuItems, tag }: MenuClientProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MenuItemForCart | null>(null);

  const taggedItems = useMemo(() => {
    if (!tag) return menuItems;
    if (tag === "daily") return menuItems.filter((i) => i.daily_menu);
    if (tag === "specials") return menuItems.filter((i) => i.is_special);
    if (tag === "chefs-choice") return menuItems.filter((i) => i.is_chefs_choice);
    if (tag === "bestseller") return menuItems.filter((i) => i.is_bestseller);
    return menuItems;
  }, [menuItems, tag]);

  const itemsByCategory = useMemo(
    () =>
      categories.map((cat) => ({
        ...cat,
        items: taggedItems.filter((item) => item.category_id === cat.id),
      })),
    [categories, taggedItems]
  );

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return itemsByCategory
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          const matchesSearch = !q || item.name.toLowerCase().includes(q);
          const matchesCategory =
            activeCategory === "all" || item.category_id === activeCategory;
          return matchesSearch && matchesCategory;
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [itemsByCategory, query, activeCategory]);

  return (
    <>
      {/* Tag heading */}
      {tag && tagTitles[tag] && (
        <div className="mb-6 text-center">
          <h2 className="text-h2 text-ink">{tagTitles[tag]}</h2>
          <p className="text-sm text-ink-soft mt-1">
            {taggedItems.length} item{taggedItems.length === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {/* Sticky filter bar. `top-16` clears the sticky header.
          Solid rather than glass on purpose: this sits over flat cream, where
          the placement rule in globals.css says glass reads as grey mud. */}
      <div className="sticky top-16 z-30 -mx-4 mb-10 border-y border-ink/8 bg-background/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="mb-4 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              size={18}
            />
            <input
              type="text"
              id="menu-search"
              placeholder="Search cakes, cookies, desserts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-ink/15 bg-porcelain py-2.5 pl-10 pr-4 text-sm text-ink transition-colors placeholder:text-ink-faint focus:border-berry focus:outline-none focus:ring-2 focus:ring-berry/25"
            />
          </div>
        </div>

        {/* Category chips — horizontally scrollable on narrow screens rather
            than wrapping into a four-line block. */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
          <button
            type="button"
            className={`filter-chip flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === "all"
                ? "border-berry bg-berry text-white"
                : "border-ink/15 bg-porcelain text-ink-soft hover:border-berry hover:text-berry"
            }`}
            data-category="all"
            onClick={() => setActiveCategory("all")}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`filter-chip flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "border-berry bg-berry text-white"
                  : "border-ink/15 bg-porcelain text-ink-soft hover:border-berry hover:text-berry"
              }`}
              data-category={cat.id}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu sections */}
      {visibleSections.map((cat) => (
        <section key={cat.id} className="mb-16" data-category-section={cat.id}>
          {/* Heading with a hairline rule running to the edge — cheap, and it
              gives each category a clear top boundary. */}
          {/* The h2 must NOT be whitespace-nowrap: at text-h2's 32px floor a
              name like "Cupcakes, Muffins & Brownies" is ~480px wide and blew
              the 375px viewport out by 189px. */}
          <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-h2 text-ink">{cat.name}</h2>
            <span aria-hidden="true" className="hidden h-px flex-1 bg-ink/12 sm:block" />
            <span className="text-eyebrow whitespace-nowrap text-ink-soft">
              {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
            </span>
          </div>
          <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((item) => (
              <RevealItem key={item.id} className="h-full">
                <MenuItemCard
                  item={item}
                  onSelect={setSelectedItem}
                  showDietaryTags
                />
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      ))}

      {/* Empty state */}
      {menuItems.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-lg text-ink-soft">
            Our menu is being updated. Please check back soon! 🧁
          </p>
        </div>
      )}

      <ItemDetailModal
        item={selectedItem}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}