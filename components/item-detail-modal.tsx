"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { calculateUnitPrice, calculateLineTotal, formatPrice } from "@/lib/cart/math";
import type { MenuItemForCart, CartItemSelection } from "@/lib/cart/types";

interface ItemDetailModalProps {
  item: MenuItemForCart | null;
  open: boolean;
  onClose: () => void;
}

export function ItemDetailModal({ item, open, onClose }: ItemDetailModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<CartItemSelection>({});

  // Reset selections when item changes
  useEffect(() => {
    if (!item) return;
    const init: CartItemSelection = {};
    // Auto-select first option for required fields
    if (item.price_model === "weight_tiers" && item.price_options.length > 0) {
      init.weight = item.price_options[0].label;
    }
    if (item.size_options.length > 0) {
      init.size = item.size_options[0].label;
    }
    if (item.variants.length > 0) {
      init.variant = item.variants[0].label;
    }
    if (item.decoration_tiers.length > 0) {
      init.decoration = item.decoration_tiers[0].label;
    }
    init.addons = [];
    const id = setTimeout(() => {
      setSelections(init);
      setQuantity(Math.max(1, item.min_order_qty));
    }, 0);
    return () => clearTimeout(id);
  }, [item]);

  if (!item) return null;

  const unitPrice = calculateUnitPrice(item, selections);
  const lineTotal = calculateLineTotal(unitPrice, quantity);

  const handleAddAddon = (addonName: string) => {
    const current = selections.addons ?? [];
    if (current.includes(addonName)) {
      setSelections({
        ...selections,
        addons: current.filter((a) => a !== addonName),
      });
    } else {
      setSelections({ ...selections, addons: [...current, addonName] });
    }
  };

  const handleAddToCart = () => {
    addToCart(item, selections, quantity);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={item.name} size="lg">
      <div className="flex flex-col gap-6">
        {/* Image */}
        {item.image_url && (
          <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-pink-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-sm text-ink-soft leading-relaxed">{item.description}</p>
        )}

        {/* Sold out notice */}
        {item.is_sold_out && (
          <div className="rounded-xl bg-ink/5 p-4 text-center">
            <p className="text-sm font-medium text-ink-soft">
              This item is currently sold out. Please check back later.
            </p>
          </div>
        )}

        {!item.is_sold_out && (
          <>
            {/* Weight tiers (for weight_tiers price model) */}
            {item.price_model === "weight_tiers" && item.price_options.length > 0 && (
              <SelectionGroup
                label="Weight"
                options={item.price_options.map((o) => ({
                  label: o.label,
                  value: o.label,
                  priceText: o.price != null ? formatPrice(o.price) : "Select",
                }))}
                selected={selections.weight}
                onSelect={(v) => setSelections({ ...selections, weight: v })}
              />
            )}

            {/* Size options */}
            {item.size_options.length > 0 && (
              <SelectionGroup
                label="Size"
                options={item.size_options.map((o) => ({
                  label: o.label,
                  value: o.label,
                  priceText: o.price_delta ? `+${formatPrice(o.price_delta)}` : "Base",
                }))}
                selected={selections.size}
                onSelect={(v) => setSelections({ ...selections, size: v })}
              />
            )}

            {/* Variants */}
            {item.variants.length > 0 && (
              <SelectionGroup
                label="Flavor / Variant"
                options={item.variants.map((v) => ({
                  label: v.label,
                  value: v.label,
                  priceText: v.price_delta ? `+${formatPrice(v.price_delta)}` : "",
                }))}
                selected={selections.variant}
                onSelect={(v) => setSelections({ ...selections, variant: v })}
              />
            )}

            {/* Decoration tiers */}
            {item.decoration_tiers.length > 0 && (
              <SelectionGroup
                label="Decoration"
                options={item.decoration_tiers.map((d) => ({
                  label: d.label,
                  value: d.label,
                  priceText: d.price_delta ? `+${formatPrice(d.price_delta)}` : "",
                }))}
                selected={selections.decoration}
                onSelect={(v) => setSelections({ ...selections, decoration: v })}
              />
            )}

            {/* Addons (multi-select) */}
            {item.addons.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-soft">
                  Add-ons
                </label>
                <div className="flex flex-wrap gap-2">
                  {item.addons
                    .filter((a) => a.is_active !== false)
                    .map((addon) => {
                      const selected = selections.addons?.includes(addon.name);
                      return (
                        <button
                          key={addon.name}
                          onClick={() => handleAddAddon(addon.name)}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? "border-mint bg-mint-soft text-mint"
                              : "border-ink/15 bg-white text-ink-soft hover:border-mint"
                          }`}
                        >
                          {addon.name}{" "}
                          <span className="text-xs">
                            +{formatPrice(addon.price)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Custom notice warning */}
            {item.requires_custom_notice && (
              <div className="rounded-xl bg-yellow-soft border border-yellow/20 p-3">
                <p className="text-sm text-ink-soft">
                  ⏰ This item requires 5 days advance notice.
                </p>
              </div>
            )}

            {/* Quantity + Price + Add button */}
            <div className="flex items-center justify-between gap-4 border-t border-ink/8 pt-4">
              {/* Quantity */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(item.min_order_qty, quantity - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-ink hover:bg-pink-soft transition-colors"
                  disabled={quantity <= item.min_order_qty}
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-semibold text-ink">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-ink hover:bg-pink-soft transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Total + Add */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-ink-faint">Total</p>
                  <p className="text-lg font-bold text-pink">{formatPrice(lineTotal)}</p>
                </div>
                <Button onClick={handleAddToCart} size="md" variant="primary">
                  <ShoppingBag size={16} /> Add to Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// --- Helper component for single-select option groups ---

function SelectionGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { label: string; value: string; priceText: string }[];
  selected?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink-soft">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              selected === opt.value
                ? "border-pink bg-pink-soft text-pink"
                : "border-ink/15 bg-white text-ink-soft hover:border-pink"
            }`}
          >
            {opt.label}
            {opt.priceText && (
              <span className="ml-1 text-xs text-ink-faint">{opt.priceText}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
