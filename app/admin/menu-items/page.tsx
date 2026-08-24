"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { uploadFile, deleteFile } from "@/lib/storage/upload-helper";
import { formatPrice } from "@/lib/cart/math";
import type { PriceOption, Addon } from "@/lib/cart/types";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price_cents: number;
  price_model: string;
  price_options: PriceOption[];
  addons: Addon[];
  variants: PriceOption[];
  decoration_tiers: PriceOption[];
  size_options: PriceOption[];
  min_order_qty: number;
  dietary_tags: string[];
  image_url: string | null;
  is_sold_out: boolean;
  is_active: boolean;
  sort_order: number;
  requires_custom_notice: boolean;
  daily_menu: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminMenuItemsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: menuData }, { data: catData }] = await Promise.all([
      supabase.from("menu_items").select("*").order("sort_order"),
      supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
    ]);
    setItems((menuData as MenuItem[]) ?? []);
    setCategories(catData ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchData(); }, 0);
    return () => clearTimeout(id);
  }, [fetchData]);

  const handleSave = async (item: Partial<MenuItem>) => {
    setSaving(true);
    try {
      if (item.id) {
        await supabase.from("menu_items").update(item).eq("id", item.id);
      } else {
        await supabase.from("menu_items").insert(item);
      }
      setEditing(null);
      setCreating(false);
      fetchData();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string | null) => {
    if (!confirm("Delete this menu item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    if (imageUrl) {
      const path = imageUrl.split("/menu-items/")[1];
      if (path) await deleteFile("menu-items", path);
    }
    fetchData();
  };

  const toggleSoldOut = async (item: MenuItem) => {
    await supabase.from("menu_items").update({ is_sold_out: !item.is_sold_out }).eq("id", item.id);
    fetchData();
  };

  const handleUpload = async (file: File): Promise<string | null> => {
    setUploading(true);
    const result = await uploadFile("menu-items", file);
    setUploading(false);
    return result.url;
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Menu Items</h1>
        <Button onClick={() => setCreating(true)} variant="primary">
          <Plus size={18} /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="flex flex-col gap-3">
            {item.image_url && (
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-pink-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-ink">{item.name}</h3>
                <span className="text-sm font-semibold text-pink whitespace-nowrap">
                  {formatPrice(item.base_price_cents)}
                </span>
              </div>
              {item.description && (
                <p className="text-xs text-ink-soft mt-1 line-clamp-2">{item.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {item.is_sold_out && <Badge color="neutral">Sold Out</Badge>}
                {!item.is_active && <Badge color="neutral">Hidden</Badge>}
                {item.daily_menu && <Badge color="pink">Today&apos;s Menu</Badge>}
                {item.requires_custom_notice && <Badge color="lavender">Custom Notice</Badge>}
                {item.dietary_tags?.map((tag) => (
                  <Badge key={tag} color="mint">{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(item)}>
                <Pencil size={14} /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleSoldOut(item)}>
                {item.is_sold_out ? "Mark Available" : "Mark Sold Out"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id, item.image_url)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {(editing || creating) && (
        <MenuItemForm
          item={editing}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setEditing(null); setCreating(false); }}
          saving={saving}
          uploading={uploading}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}

function MenuItemForm({
  item,
  categories,
  onSave,
  onClose,
  saving,
  uploading,
  onUpload,
}: {
  item: MenuItem | null;
  categories: Category[];
  onSave: (item: Partial<MenuItem>) => void;
  onClose: () => void;
  saving: boolean;
  uploading: boolean;
  onUpload: (file: File) => Promise<string | null>;
}) {
  const [form, setForm] = useState<Partial<MenuItem>>(
    item ?? {
      name: "",
      description: "",
      base_price_cents: 0,
      price_model: "flat",
      price_options: [],
      addons: [],
      variants: [],
      decoration_tiers: [],
      size_options: [],
      min_order_qty: 1,
      dietary_tags: [],
      image_url: null,
      is_sold_out: false,
      is_active: true,
      sort_order: 0,
      requires_custom_notice: false,
      daily_menu: false,
    }
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await onUpload(file);
      if (url) setForm({ ...form, image_url: url });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal open onClose={onClose} title={item ? "Edit Menu Item" : "Add Menu Item"} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Image upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-soft">Image</label>
          {form.image_url ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="Preview" className="h-32 w-32 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setForm({ ...form, image_url: null })}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/15 hover:border-pink transition-colors">
              <div className="text-center">
                <Upload className="mx-auto text-ink-faint" size={20} />
                <span className="text-xs text-ink-faint">{uploading ? "Uploading..." : "Upload"}</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Category" value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
            <option value="">Uncategorized</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>
        </div>

        <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Base Price (paise)" type="number" value={form.base_price_cents ?? 0} onChange={(e) => setForm({ ...form, base_price_cents: parseInt(e.target.value) || 0 })} />
          <Select label="Price Model" value={form.price_model ?? "flat"} onChange={(e) => setForm({ ...form, price_model: e.target.value })}>
            <option value="flat">Flat</option>
            <option value="weight_tiers">Weight Tiers</option>
            <option value="base_half_kg">Base ½kg + Size</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Min Order Qty" type="number" value={form.min_order_qty ?? 1} onChange={(e) => setForm({ ...form, min_order_qty: parseInt(e.target.value) || 1 })} />
          <Input label="Sort Order" type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
        </div>

        <Input
          label="Dietary Tags (comma-separated: egg, eggless, vegan, gluten-free)"
          value={(form.dietary_tags ?? []).join(", ")}
          onChange={(e) => setForm({ ...form, dietary_tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
        />

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.is_sold_out ?? false} onChange={(e) => setForm({ ...form, is_sold_out: e.target.checked })} />
            Sold Out
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.requires_custom_notice ?? false} onChange={(e) => setForm({ ...form, requires_custom_notice: e.target.checked })} />
            Requires Custom Notice (5 days)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.daily_menu ?? false} onChange={(e) => setForm({ ...form, daily_menu: e.target.checked })} />
            On Today&apos;s Menu
          </label>
        </div>

        {/* JSON fields for advanced options */}
        <Textarea
          label="Price Options (JSON: weight tiers)"
          value={JSON.stringify(form.price_options ?? [], null, 2)}
          onChange={(e) => { try { setForm({ ...form, price_options: JSON.parse(e.target.value) }); } catch {} }}
          rows={3}
        />
        <Textarea
          label="Addons (JSON: [{name, price, is_active}])"
          value={JSON.stringify(form.addons ?? [], null, 2)}
          onChange={(e) => { try { setForm({ ...form, addons: JSON.parse(e.target.value) }); } catch {} }}
          rows={3}
        />
        <Textarea
          label="Variants (JSON: [{label, price_delta}])"
          value={JSON.stringify(form.variants ?? [], null, 2)}
          onChange={(e) => { try { setForm({ ...form, variants: JSON.parse(e.target.value) }); } catch {} }}
          rows={3}
        />
        <Textarea
          label="Decoration Tiers (JSON: [{label, price_delta}])"
          value={JSON.stringify(form.decoration_tiers ?? [], null, 2)}
          onChange={(e) => { try { setForm({ ...form, decoration_tiers: JSON.parse(e.target.value) }); } catch {} }}
          rows={3}
        />
        <Textarea
          label="Size Options (JSON: [{label, price_delta}])"
          value={JSON.stringify(form.size_options ?? [], null, 2)}
          onChange={(e) => { try { setForm({ ...form, size_options: JSON.parse(e.target.value) }); } catch {} }}
          rows={3}
        />

        <div className="flex justify-end gap-3 border-t border-ink/8 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
