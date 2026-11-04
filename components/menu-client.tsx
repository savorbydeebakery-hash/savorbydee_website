"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { resolveCategoryParam } from "@/lib/menu/category-slug";
import { Search } from "lucide-react";
import { MenuItemCard } from "@/components/menu-item-card";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { CategoryJumpNav, sectionAnchor } from "@/components/menu/category-jump-nav";
import { KITCHEN_NOTE } from "@/lib/menu/kitchen-note";
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
  /** `?category=`, a slug or id: the section to open at. Unknown values open at the top. */
  initialCategory?: string;
}

const tagTitles: Record<string, string> = {
  daily: "Today's Menu",
  specials: "Specials",
  "chefs-choice": "Chef's Choice",
  bestseller: "Most Ordered",
};

export function MenuClient({ categories, menuItems, tag, initialCategory }: MenuClientProps) {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItemForCart | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Opens at the category it was linked to, with the rest of the menu still there.
  useEffect(() => {
    const id = resolveCategoryParam(initialCategory, categories);
    const category = categories.find((c) => c.id === id);
    if (category) document.getElementById(sectionAnchor(category.name))?.scrollIntoView();
  }, [initialCategory, categories]);

  // The same arrival as Today's Menu, see components/menu/menu-type-grid.tsx. Not
  // RevealGroup: it keeps every card drifting by a different amount as the page
  // scrolls, which on two across pulls a row's cards out of line with each other.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        root.current?.querySelectorAll<HTMLElement>("section[id^='cat-']").forEach((section) => {
          gsap.from(section.querySelectorAll(".menu-item-card"), {
            y: 24,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
            immediateRender: false,
            stagger: { each: 0.05, from: "start" },
            scrollTrigger: { trigger: section, start: "top bottom-=40", once: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  const taggedItems = useMemo(() => {
    if (!tag) return menuItems;
    if (tag === "daily") return menuItems.filter((i) => i.daily_menu);
    if (tag === "specials") return menuItems.filter((i) => i.is_special);
    if (tag === "chefs-choice") return menuItems.filter((i) => i.is_chefs_choice);
    if (tag === "bestseller") return menuItems.filter((i) => i.is_bestseller);
    return menuItems;
  }, [menuItems, tag]);

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        items: taggedItems.filter(
          (item) => item.category_id === cat.id && (!q || item.name.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, taggedItems, query]);

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

      {/* Scrolls away with the page: only the chips stay stuck, as on Today's
          Menu. The two together took a quarter of a phone's screen. */}
      <div className="mb-1 flex justify-center">
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

      <div ref={root}>
        {/* A category's own page has nothing to jump between. */}
        {categories.length > 1 && visibleSections.length > 0 && (
          <CategoryJumpNav
            sections={visibleSections.map((cat) => ({ name: cat.name, count: cat.items.length }))}
          />
        )}

        {/* Menu sections */}
        {visibleSections.map((cat) => (
          <section
            key={cat.id}
            id={sectionAnchor(cat.name)}
            className="mb-7 scroll-mt-32 sm:mb-16"
            data-category-section={cat.id}
          >
            {/* Heading with a hairline rule running to the edge — cheap, and it
                gives each category a clear top boundary. */}
            {/* The same heading as Today's Menu. The h2 must NOT be
                whitespace-nowrap: a long category name blows out a phone's width. */}
            <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mb-6 sm:gap-x-4">
              <h2 className="bk-section-title text-ink">{cat.name}</h2>
              <span aria-hidden="true" className="hidden h-px flex-1 bg-ink/12 sm:block" />
              <span className="text-eyebrow whitespace-nowrap text-ink-soft">
                {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
              </span>
            </div>
            {/* Two across on a phone (client, 2026-11-04), to fit more on a screen. */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {cat.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onSelect={setSelectedItem}
                  showDietaryTags
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Said once here rather than as a tag on every item. */}
      {menuItems.length > 0 && (
        <p className="mx-auto max-w-2xl rounded-xl bg-ink/5 px-4 py-3 text-center text-sm text-ink-soft">
          {KITCHEN_NOTE}
        </p>
      )}

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
