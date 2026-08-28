"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/store";
import { formatPrice } from "@/lib/cart/math";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, ArrowRight, Trash2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const { items, totalCents, totalItems, updateQuantity, removeFromCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <ShoppingBag className="mx-auto mb-4 text-ink-faint" size={48} />
        <h1 className="text-2xl font-bold text-ink mb-2">Your cart is empty</h1>
        <p className="text-ink-soft mb-6">Browse our menu and add some treats!</p>
        <Button onClick={() => router.push("/menu")} variant="primary">
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-ink mb-6">Your Cart</h1>

      <div className="flex flex-col gap-4 mb-6">
        {items.map((item) => (
          <Card key={item.id} className="flex items-center gap-4">
            {item.image_url && (
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-pink-soft flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-ink">{item.name}</h3>
              <p className="text-xs text-ink-soft">
                {item.selections.size && `Size: ${item.selections.size} · `}
                {item.selections.variant && `Variant: ${item.selections.variant} · `}
                {formatPrice(item.unitPriceCents)} each
              </p>
              {item.selections.addons && item.selections.addons.length > 0 && (
                <p className="text-xs text-ink-faint">
                  Add-ons: {item.selections.addons.join(", ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 hover:bg-pink-soft"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 hover:bg-pink-soft"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gold-deep">{formatPrice(item.lineTotalCents)}</p>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-xs text-ink-faint hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-ink/8 pt-4 mb-6">
        <div>
          <p className="text-sm text-ink-soft">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
          <p className="text-2xl font-bold text-ink">{formatPrice(totalCents)}</p>
        </div>
        <Link href="/cart/checkout">
          <Button variant="primary" size="lg">
            Checkout <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
