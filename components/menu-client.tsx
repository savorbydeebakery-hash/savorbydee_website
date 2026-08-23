"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDetailModal } from "@/components/item-detail-modal";
import type { MenuItemForCart } from "@/lib/cart/types";

interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface MenuClientProps {
  categories: MenuCategory[];
  menuItems: MenuItemForCart[];
}

const dietaryColors: Record<string, "mint" | "lavender" | "sky" | "yellow"> = {
  egg: "yellow",
  eggless: "mint",
  vegan: "lavender",
  "gluten-free": "sky",
  "sugar-free": "lavender",
  "nut-free": "sky",
};

export function MenuClient({ categories, menuItems }: MenuClientProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MenuItemForCart | null>(null);

  const itemsByCategory = useMemo(
    () =>
      categories.map((cat) => ({
        ...cat,
        items: menuItems.filter((item) => item.category_id === cat.id),
      })),
    [categories, menuItems]
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
      {/* Search bar */}
      <div className="mb-8 flex justify-center">
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
            className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20 transition-colors"
          />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className={`filter-chip rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === "all"
              ? "border-pink bg-pink-soft text-pink"
              : "border-ink/15 bg-white text-ink-soft hover:border-pink hover:text-pink"
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
            className={`filter-chip rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? "border-pink bg-pink-soft text-pink"
                : "border-ink/15 bg-white text-ink-soft hover:border-pink hover:text-pink"
            }`}
            data-category={cat.id}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu sections */}
      {visibleSections.map((cat) => (
        <section key={cat.id} className="mb-12" data-category-section={cat.id}>
          <h2 className="mb-5 text-2xl font-semibold text-ink">{cat.name}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((item) => (
              <Card
                key={item.id}
                hover
                className="menu-item-card flex flex-col gap-3"
                data-item-id={item.id}
                data-item-name={item.name.toLowerCase()}
              >
                {item.image_url && (
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-pink-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink">{item.name}</h3>
                    {item.is_sold_out ? (
                      <Badge color="neutral">Sold Out</Badge>
                    ) : (
                      <span className="whitespace-nowrap text-sm font-semibold text-pink">
                        ₹{(item.base_price_cents / 100).toFixed(0)}+
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="line-clamp-2 text-sm text-ink-soft">
                      {item.description}
                    </p>
                  )}
                  {item.dietary_tags && item.dietary_tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.dietary_tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          color={dietaryColors[tag.toLowerCase()] ?? "neutral"}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto pt-2">
                    <Button
                      size="sm"
                      variant={item.is_sold_out ? "ghost" : "primary"}
                      disabled={item.is_sold_out}
                      className="w-full"
                      data-item-id={item.id}
                      data-item-name={item.name}
                      data-item-price={item.base_price_cents}
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.is_sold_out ? "Unavailable" : "Add to Cart"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
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