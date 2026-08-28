"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CartItem, CartItemSelection, MenuItemForCart } from "./types";
import {
  calculateUnitPrice,
  calculateLineTotal,
  calculateCartTotal,
  countTotalItems,
  generateCartLineId,
  isSameCartItem,
} from "./math";

/**
 * Lightweight cart store using useSyncExternalStore + localStorage.
 * No external state library needed.
 */

const CART_STORAGE_KEY = "savor-cart";
const CART_EVENT = "savor-cart-change";

interface CartState {
  items: CartItem[];
}

let state: CartState = { items: [] };
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        state = { items: parsed.items };
      }
    }
  } catch {
    // Corrupted storage — start fresh
  }
}

function persist() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — non-fatal
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

function subscribe(callback: () => void) {
  init();
  const handler = () => callback();
  window.addEventListener(CART_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CART_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot(): CartState {
  return state;
}

// --- Actions ---

export function addToCart(
  item: MenuItemForCart,
  selections: CartItemSelection,
  quantity: number = 1
) {
  init();
  const unitPriceCents = calculateUnitPrice(item, selections);
  const lineTotalCents = calculateLineTotal(unitPriceCents, quantity);

  const newItem = {
    id: generateCartLineId(),
    menuItemId: item.id,
    name: item.name,
    unitPriceCents,
    quantity,
    selections,
    lineTotalCents,
    image_url: item.image_url,
    requiresCustomNotice: item.requires_custom_notice,
  };

  // Check if identical item already in cart → merge by incrementing quantity
  const existingIdx = state.items.findIndex((existing) =>
    isSameCartItem(existing, newItem)
  );

  if (existingIdx >= 0) {
    const existing = state.items[existingIdx];
    const merged = {
      ...existing,
      quantity: existing.quantity + quantity,
      lineTotalCents: (existing.quantity + quantity) * existing.unitPriceCents,
    };
    state = {
      items: [
        ...state.items.slice(0, existingIdx),
        merged,
        ...state.items.slice(existingIdx + 1),
      ],
    };
  } else {
    state = { items: [...state.items, newItem] };
  }

  persist();
}

export function removeFromCart(cartLineId: string) {
  init();
  state = {
    items: state.items.filter((item) => item.id !== cartLineId),
  };
  persist();
}

export function updateQuantity(cartLineId: string, quantity: number) {
  init();
  if (quantity < 1) {
    removeFromCart(cartLineId);
    return;
  }
  state = {
    items: state.items.map((item) =>
      item.id === cartLineId
        ? {
            ...item,
            quantity,
            lineTotalCents: item.unitPriceCents * quantity,
          }
        : item
    ),
  };
  persist();
}

export function clearCart() {
  init();
  state = { items: [] };
  persist();
}

// --- Hook ---

// Stable, referentially-cached server snapshot for useSyncExternalStore.
// An inline `() => ({ items: [] })` creates a new object every render, which
// React flags as "getServerSnapshot should be cached" and can cause loops.
const SERVER_SNAPSHOT: CartState = { items: [] };

export function useCart() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  const totalCents = calculateCartTotal(snapshot.items);
  const totalItems = countTotalItems(snapshot.items);

  const add = useCallback(
    (item: MenuItemForCart, selections: CartItemSelection, quantity?: number) =>
      addToCart(item, selections, quantity),
    []
  );

  const remove = useCallback((id: string) => removeFromCart(id), []);
  const updateQty = useCallback((id: string, qty: number) => updateQuantity(id, qty), []);
  const clear = useCallback(() => clearCart(), []);

  return {
    items: snapshot.items,
    totalCents,
    totalItems,
    addToCart: add,
    removeFromCart: remove,
    updateQuantity: updateQty,
    clearCart: clear,
  };
}
