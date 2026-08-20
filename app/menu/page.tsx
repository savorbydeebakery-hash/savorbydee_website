import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const metadata = {
  title: "Menu — SAVOR Bakery",
  description:
    "Browse our full menu of cakes, desserts, cookies, and savoury bakes. Pre-order online with 12 hours notice.",
};

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: menuItems }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id"
      )
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  // Group items by category
  const itemsByCategory = (categories ?? []).map((cat) => ({
    ...cat,
    items: (menuItems ?? []).filter((item) => item.category_id === cat.id),
  }));

  const dietaryColors: Record<string, "mint" | "lavender" | "sky" | "yellow"> = {
    egg: "yellow",
    "eggless": "mint",
    vegan: "lavender",
    "gluten-free": "sky",
    "sugar-free": "lavender",
    "nut-free": "sky",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <Badge color="pink" className="mb-3">Fresh to Order</Badge>
        <h1 className="text-4xl font-bold text-ink mb-3">Our Menu</h1>
        <p className="text-ink-soft max-w-xl mx-auto">
          Every item is made fresh when you order. Please allow at least 12 hours
          for standard items.
        </p>
      </div>

      {/* Search bar (client-side filter) */}
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
            className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20 transition-colors"
          />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="mb-10 flex flex-wrap justify-center gap-2 no-scrollbar">
        <button
          className="filter-chip active rounded-full border border-pink bg-pink-soft px-4 py-1.5 text-sm font-medium text-pink"
          data-category="all"
        >
          All
        </button>
        {(categories ?? []).map((cat) => (
          <button
            key={cat.id}
            className="filter-chip rounded-full border border-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-ink-soft hover:border-pink hover:text-pink transition-colors"
            data-category={cat.id}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu sections by category */}
      {itemsByCategory.map((cat) => {
        if (cat.items.length === 0) return null;
        return (
          <section key={cat.id} className="mb-12" data-category-section={cat.id}>
            <h2 className="text-2xl font-semibold text-ink mb-5">{cat.name}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.items.map((item) => (
                <Card
                  key={item.id}
                  hover
                  className="menu-item-card flex flex-col gap-3"
                  data-item-id={item.id}
                  data-item-name={item.name.toLowerCase()}
                >
                  {/* Image */}
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

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-ink">{item.name}</h3>
                      {item.is_sold_out ? (
                        <Badge color="neutral">Sold Out</Badge>
                      ) : (
                        <span className="text-sm font-semibold text-pink whitespace-nowrap">
                          ₹{(item.base_price_cents / 100).toFixed(0)}+
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-ink-soft line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Dietary badges */}
                    {item.dietary_tags && item.dietary_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
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

                    {/* Add to cart */}
                    <div className="mt-auto pt-2">
                      <Button
                        size="sm"
                        variant={item.is_sold_out ? "ghost" : "primary"}
                        disabled={item.is_sold_out}
                        className="w-full add-to-cart-btn"
                        data-item-id={item.id}
                        data-item-name={item.name}
                        data-item-price={item.base_price_cents}
                      >
                        {item.is_sold_out ? "Unavailable" : "View & Add"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty state */}
      {(!menuItems || menuItems.length === 0) && (
        <div className="text-center py-20">
          <p className="text-lg text-ink-soft">
            Our menu is being updated. Please check back soon! 🧁
          </p>
        </div>
      )}

      {/* Client-side search + filter script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const search = document.getElementById('menu-search');
              const chips = document.querySelectorAll('.filter-chip');
              const sections = document.querySelectorAll('[data-category-section]');
              const cards = document.querySelectorAll('.menu-item-card');

              function applyFilters() {
                const query = (search?.value ?? '').toLowerCase().trim();
                const activeChip = document.querySelector('.filter-chip.active');
                const activeCat = activeChip?.dataset.category ?? 'all';

                cards.forEach(card => {
                  const name = card.dataset.itemName ?? '';
                  const cardCat = card.closest('[data-category-section]')?.dataset.categorySection;
                  const matchesSearch = !query || name.includes(query);
                  const matchesCat = activeCat === 'all' || cardCat === activeCat;
                  card.style.display = matchesSearch && matchesCat ? '' : 'none';
                });

                sections.forEach(sec => {
                  const visibleCards = sec.querySelectorAll('.menu-item-card:not([style*="display: none"])');
                  sec.style.display = visibleCards.length > 0 ? '' : 'none';
                });
              }

              search?.addEventListener('input', applyFilters);

              chips.forEach(chip => {
                chip.addEventListener('click', () => {
                  chips.forEach(c => {
                    c.classList.remove('active', 'border-pink', 'bg-pink-soft', 'text-pink');
                    c.classList.add('border-ink/15', 'bg-white', 'text-ink-soft');
                  });
                  chip.classList.add('active', 'border-pink', 'bg-pink-soft', 'text-pink');
                  chip.classList.remove('border-ink/15', 'bg-white', 'text-ink-soft');
                  applyFilters();
                });
              });
            })();
          `,
        }}
      />
    </div>
  );
}
