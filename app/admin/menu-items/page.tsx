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
import { OptionRowsEditor } from "@/components/admin/option-rows-editor";
import { paiseToRupeeInput, rupeeInputToPaise } from "@/lib/admin/money";
import {
  toOptionDrafts,
  fromOptionDrafts,
  toAddonDrafts,
  fromAddonDrafts,
  type OptionRowDraft,
} from "@/lib/admin/option-rows";
import { resolveNotice, resolveBulk } from "@/lib/admin/effective-rules";
import { describeWriteError } from "@/lib/admin/write-error";
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
  /** Units available. null = not tracked (no counter shown), 0 = out of stock. */
  stock_count: number | null;
  /** Null means inherit from the category, then the site. Not the same as 0. */
  notice_hours: number | null;
  bulk_threshold: number | null;
  dietary_tags: string[];
  image_url: string | null;
  is_sold_out: boolean;
  is_active: boolean;
  sort_order: number;
  requires_custom_notice: boolean;
  daily_menu: boolean;
  is_preorder: boolean;
  is_special: boolean;
  is_chefs_choice: boolean;
  is_bestseller: boolean;
}

interface Category {
  id: string;
  name: string;
  /** Needed to tell the client what a blank item field will actually inherit. */
  notice_hours: number | null;
  bulk_threshold: number | null;
}

/** The site defaults, the last rung of the inherit ladder. */
interface RuleDefaults {
  global_notice_hours: number;
  preorder_notice_hours: number;
  bulk_threshold: number;
  custom_cake_notice_days: number;
}

const FALLBACK_DEFAULTS: RuleDefaults = {
  global_notice_hours: 2,
  preorder_notice_hours: 24,
  bulk_threshold: 12,
  custom_cake_notice_days: 5,
};

export default function AdminMenuItemsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaults, setDefaults] = useState<RuleDefaults>(FALLBACK_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [{ data: menuData }, { data: catData }, { data: settingsData }] = await Promise.all([
      supabase.from("menu_items").select("*").order("sort_order"),
      supabase
        .from("categories")
        .select("id, name, notice_hours, bulk_threshold")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("site_settings")
        .select("global_notice_hours, preorder_notice_hours, bulk_threshold, custom_cake_notice_days")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    setItems((menuData as MenuItem[]) ?? []);
    setCategories((catData as Category[]) ?? []);
    // Falling back rather than blocking: the defaults are only used to explain
    // what a blank box inherits, and a settings hiccup should not stop the
    // client editing a price.
    if (settingsData) setDefaults({ ...FALLBACK_DEFAULTS, ...(settingsData as Partial<RuleDefaults>) });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchData(); }, 0);
    return () => clearTimeout(id);
  }, [fetchData]);

  /**
   * supabase-js resolves on a database error — it returns `{ error }` and does
   * not throw — so the try/catch that used to wrap this was dead code. Every
   * refused write closed the modal, refetched, and showed the client their old
   * value back with nothing to explain it. The failures most likely here are
   * exactly the ones that look like nothing happened: a check constraint on
   * notice hours, an expired session hitting RLS, a deleted category.
   */
  const handleSave = async (item: Partial<MenuItem>) => {
    setSaving(true);
    setSaveError(null);

    const { error } = item.id
      ? await supabase.from("menu_items").update(item).eq("id", item.id)
      : await supabase.from("menu_items").insert(item);

    setSaving(false);

    if (error) {
      // The modal stays open so the edit is not lost on the way out.
      setSaveError(describeWriteError(error, "this item"));
      return;
    }

    setEditing(null);
    setCreating(false);
    fetchData();
  };

  const handleDelete = async (id: string, imageUrl: string | null) => {
    if (!confirm("Delete this menu item?")) return;
    setListError(null);
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      setListError(describeWriteError(error, "this item"));
      return;
    }
    // Only after the row is gone: deleting the photo first would strand the
    // item with a broken image if the delete were refused.
    if (imageUrl) {
      const path = imageUrl.split("/menu-items/")[1];
      if (path) await deleteFile("menu-items", path);
    }
    fetchData();
  };

  const toggleSoldOut = async (item: MenuItem) => {
    setListError(null);
    const { error } = await supabase
      .from("menu_items")
      .update({ is_sold_out: !item.is_sold_out })
      .eq("id", item.id);
    if (error) {
      setListError(describeWriteError(error, "that change"));
      return;
    }
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

      {listError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>
      )}

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
                {item.stock_count != null && (
                  <Badge color={item.stock_count === 0 ? "neutral" : "mint"}>
                    {item.stock_count === 0 ? "Out of stock" : `${item.stock_count} in stock`}
                  </Badge>
                )}
                {!item.is_active && <Badge color="neutral">Hidden</Badge>}
                {item.daily_menu && <Badge color="pink">Today&apos;s Menu</Badge>}
                {item.is_special && <Badge color="yellow">Special</Badge>}
                {item.is_chefs_choice && <Badge color="lavender">Chef&apos;s Choice</Badge>}
                {item.is_bestseller && <Badge color="mint">Bestseller</Badge>}
                {item.requires_custom_notice && <Badge color="neutral">Custom Notice</Badge>}
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
          defaults={defaults}
          onSave={handleSave}
          onClose={() => { setEditing(null); setCreating(false); setSaveError(null); }}
          saving={saving}
          saveError={saveError}
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
  defaults,
  onClose,
  saving,
  saveError,
  uploading,
  onUpload,
}: {
  item: MenuItem | null;
  categories: Category[];
  defaults: RuleDefaults;
  onSave: (item: Partial<MenuItem>) => void;
  onClose: () => void;
  saving: boolean;
  saveError: string | null;
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
      stock_count: null,
      notice_hours: null,
      bulk_threshold: null,
      dietary_tags: [],
      image_url: null,
      is_sold_out: false,
      is_active: true,
      sort_order: 0,
      requires_custom_notice: false,
      daily_menu: false,
      is_preorder: false,
      is_special: false,
      is_chefs_choice: false,
      is_bestseller: false,
    }
  );

  // The option lists live as rows of raw text while the modal is open and are
  // converted back once, on save. Seeded from the item and never re-derived
  // from `form`, so nothing the client types can be overwritten mid-edit.
  const [priceRows, setPriceRows] = useState<OptionRowDraft[]>(() =>
    toOptionDrafts(item?.price_options, "price", paiseToRupeeInput)
  );
  const [sizeRows, setSizeRows] = useState<OptionRowDraft[]>(() =>
    toOptionDrafts(item?.size_options, "price_delta", paiseToRupeeInput)
  );
  const [variantRows, setVariantRows] = useState<OptionRowDraft[]>(() =>
    toOptionDrafts(item?.variants, "price_delta", paiseToRupeeInput)
  );
  const [decorationRows, setDecorationRows] = useState<OptionRowDraft[]>(() =>
    toOptionDrafts(item?.decoration_tiers, "price_delta", paiseToRupeeInput)
  );
  const [addonRows, setAddonRows] = useState<OptionRowDraft[]>(() =>
    toAddonDrafts(item?.addons, paiseToRupeeInput)
  );

  // Base price is edited in rupees. It was labelled "(paise)" and holding
  // 90000 for a ₹900 cake, so typing the number you meant priced it at ₹9.
  const [priceText, setPriceText] = useState(() => paiseToRupeeInput(item?.base_price_cents ?? 0));

  const category = categories.find((c) => c.id === form.category_id) ?? null;
  const notice = resolveNotice({
    itemHours: form.notice_hours,
    categoryHours: category?.notice_hours,
    categoryName: category?.name,
    dailyMenu: form.daily_menu ?? false,
    globalNoticeHours: defaults.global_notice_hours,
    preorderNoticeHours: defaults.preorder_notice_hours,
    requiresCustomNotice: form.requires_custom_notice,
    customCakeNoticeDays: defaults.custom_cake_notice_days,
  });
  const bulk = resolveBulk({
    itemThreshold: form.bulk_threshold,
    categoryThreshold: category?.bulk_threshold,
    categoryName: category?.name,
    siteThreshold: defaults.bulk_threshold,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await onUpload(file);
      if (url) setForm({ ...form, image_url: url });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      base_price_cents: rupeeInputToPaise(priceText) ?? 0,
      price_options: fromOptionDrafts(priceRows, "price"),
      size_options: fromOptionDrafts(sizeRows, "price_delta"),
      variants: fromOptionDrafts(variantRows, "price_delta"),
      decoration_tiers: fromOptionDrafts(decorationRows, "price_delta"),
      addons: fromAddonDrafts(addonRows),
    });
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
          <Input
            label="Base Price (₹)"
            type="number"
            step="0.01"
            min={0}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
          />
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

        {/* Same reasoning as the stock box below: empty means "inherit", 0 means
            "no notice needed", and `parseInt(...) || 0` would conflate them. */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Notice hours (empty = inherit)"
            type="number"
            min={0}
            value={form.notice_hours ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              const n = Number.parseInt(raw, 10);
              setForm({ ...form, notice_hours: raw === "" || Number.isNaN(n) ? null : Math.max(0, n) });
            }}
          />
          <Input
            label="Bulk threshold (empty = inherit)"
            type="number"
            min={1}
            value={form.bulk_threshold ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              const n = Number.parseInt(raw, 10);
              setForm({ ...form, bulk_threshold: raw === "" || Number.isNaN(n) ? null : Math.max(1, n) });
            }}
          />
        </div>
        {/* Blank-means-inherit is the right storage rule but a poor thing to
            look at: an empty box gives no clue whether this cake needs two
            hours or five days. These print the resolved answer, using the same
            item -> category -> menu chain the order API enforces. */}
        <div className="-mt-2 rounded-xl bg-shell/50 px-4 py-3 text-xs text-ink-soft">
          <p>
            <strong className="font-semibold text-ink">Notice for this item:</strong>{" "}
            {notice.explanation}
          </p>
          <p className="mt-1">
            <strong className="font-semibold text-ink">Counts as bulk at:</strong>{" "}
            {bulk.explanation}
          </p>
        </div>

        {/* Empty is meaningfully different from 0 here, so this cannot use the
            usual `parseInt(...) || 0` pattern: that would turn a cleared box
            into "out of stock" instead of "not tracked". */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="In Stock (leave empty for untracked)"
            type="number"
            min={0}
            value={form.stock_count ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              const parsed = Number.parseInt(raw, 10);
              setForm({
                ...form,
                stock_count: raw === "" || Number.isNaN(parsed) ? null : Math.max(0, parsed),
              });
            }}
          />
          <div className="flex items-end pb-2 text-xs text-ink-faint">
            {form.stock_count == null
              ? "No counter shown to customers."
              : form.stock_count === 0
                ? "Shows as out of stock."
                : `Shows "In stock: ${form.stock_count} available".`}
          </div>
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
            Requires Custom Notice (up to 5 days)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.daily_menu ?? false} onChange={(e) => setForm({ ...form, daily_menu: e.target.checked })} />
            On Today&apos;s Menu
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.is_special ?? false} onChange={(e) => setForm({ ...form, is_special: e.target.checked })} />
            Special
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.is_chefs_choice ?? false} onChange={(e) => setForm({ ...form, is_chefs_choice: e.target.checked })} />
            Chef&apos;s Choice
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.is_bestseller ?? false} onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })} />
            Bestseller
          </label>
        </div>

        {/* The choices a customer sees on the item. These were five JSON
            textareas that could not be typed into, so every weight tier and
            decoration on the live site was set by hand-written SQL. */}
        <div className="flex flex-col gap-5 border-t border-ink/8 pt-4">
          <OptionRowsEditor
            label="Weight / size prices"
            amountLabel="Price (₹)"
            labelPlaceholder="1 kg"
            rows={priceRows}
            onChange={setPriceRows}
            hint="A full price for each weight, not an extra. Used when Price Model is Weight Tiers. Frosted Sponge Cakes leave this empty — their weights are worked out from the base price by the category's multipliers."
          />
          <OptionRowsEditor
            label="Decoration"
            amountLabel="Extra (₹)"
            labelPlaceholder="Basic"
            rows={decorationRows}
            onChange={setDecorationRows}
            hint="Added to the price. A choice named Custom sends the customer to the custom cake enquiry instead of the basket."
          />
          <OptionRowsEditor
            label="Add-ons"
            amountLabel="Price (₹)"
            labelPlaceholder="Candles"
            rows={addonRows}
            onChange={setAddonRows}
            withActive
            hint="Optional extras the customer can tick. Switch one off to hide it without losing the price."
          />
          <OptionRowsEditor
            label="Variants"
            amountLabel="Extra (₹)"
            labelPlaceholder="Eggless"
            rows={variantRows}
            onChange={setVariantRows}
            hint="One-of choices that change the price, such as eggless."
          />
          <OptionRowsEditor
            label="Sizes"
            amountLabel="Extra (₹)"
            labelPlaceholder="6 inch"
            rows={sizeRows}
            onChange={setSizeRows}
            hint="Added to the base price. Leave empty if the item comes one size."
          />
        </div>

        {saveError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>
        )}

        <div className="flex justify-end gap-3 border-t border-ink/8 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
