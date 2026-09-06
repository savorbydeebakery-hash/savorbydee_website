"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { OptionRowsEditor } from "@/components/admin/option-rows-editor";
import {
  toMultiplierDrafts,
  fromMultiplierDrafts,
  type OptionRowDraft,
} from "@/lib/admin/option-rows";
import { describeWriteError } from "@/lib/admin/write-error";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export const dynamic = "force-dynamic";

interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  /** Null means inherit the site default. Not the same as 0. */
  notice_hours: number | null;
  bulk_threshold: number | null;
  /**
   * Derives weight prices from an item's base price — a kilo is 2x the half.
   * Null means this category prices each weight explicitly, which is what the
   * cheesecakes do. Added by migration 00034 with no way to edit it.
   */
  weight_multipliers: { label: string; multiplier: number }[] | null;
}

export default function AdminCategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [noticeHours, setNoticeHours] = useState<number | null>(null);
  const [bulkThreshold, setBulkThreshold] = useState<number | null>(null);
  const [multiplierRows, setMultiplierRows] = useState<OptionRowDraft[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) setListError(describeWriteError(error, "the category list"));
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchCategories(); }, 0);
    return () => clearTimeout(id);
  }, [fetchCategories]);

  const resetForm = () => {
    setName("");
    setNoticeHours(null);
    setBulkThreshold(null);
    setMultiplierRows([]);
    setSaveError(null);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
    resetForm();
  };

  // The editor holds rows of text; the column wants numbers, or null when the
  // client has emptied it. `multiplier` doubles as the amount box, so it reuses
  // the OptionRowDraft shape rather than needing its own editor.
  const multipliersFromRows = () =>
    fromMultiplierDrafts(multiplierRows.map((r) => ({ label: r.label, multiplier: r.amount })));

  /**
   * Every write on this page used to ignore its result. supabase-js does not
   * throw on a database error, so a refused save closed the modal, refetched,
   * and put the old value back with nothing on screen.
   */
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaveError(null);

    const fields = {
      name,
      notice_hours: noticeHours,
      bulk_threshold: bulkThreshold,
      weight_multipliers: multipliersFromRows(),
    };

    const { error } = editing
      ? await supabase
          .from("categories")
          .update({ ...fields, sort_order: editing.sort_order, is_active: editing.is_active })
          .eq("id", editing.id)
      : await supabase.from("categories").insert({
          ...fields,
          sort_order: categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1,
          is_active: true,
        });

    if (error) {
      // Modal stays open so the edit survives the failure.
      setSaveError(describeWriteError(error, "this category"));
      return;
    }

    closeModal();
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Menu items will become uncategorized.")) return;
    setListError(null);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      setListError(describeWriteError(error, "this category"));
      return;
    }
    fetchCategories();
  };

  const moveOrder = async (cat: Category, direction: "up" | "down") => {
    const swapWith = categories.find((c) => c.sort_order === cat.sort_order + (direction === "up" ? -1 : 1));
    if (!swapWith) return;
    setListError(null);
    const first = await supabase
      .from("categories")
      .update({ sort_order: cat.sort_order })
      .eq("id", swapWith.id);
    if (first.error) {
      setListError(describeWriteError(first.error, "the reorder"));
      return;
    }
    // If this half fails the two categories now share a sort_order, so say so
    // rather than leaving the list quietly wrong.
    const second = await supabase
      .from("categories")
      .update({ sort_order: swapWith.sort_order })
      .eq("id", cat.id);
    if (second.error) {
      setListError(describeWriteError(second.error, "the reorder"));
    }
    fetchCategories();
  };

  const toggleActive = async (cat: Category) => {
    setListError(null);
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    if (error) {
      setListError(describeWriteError(error, "that change"));
      return;
    }
    fetchCategories();
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Categories</h1>
        <Button onClick={() => { resetForm(); setCreating(true); }} variant="primary">
          <Plus size={18} /> Add Category
        </Button>
      </div>

      {listError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>
      )}

      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <button onClick={() => moveOrder(cat, "up")} className="text-ink-faint hover:text-ink"><ArrowUp size={14} /></button>
                <button onClick={() => moveOrder(cat, "down")} className="text-ink-faint hover:text-ink"><ArrowDown size={14} /></button>
              </div>
              <div className="flex flex-col">
                <span className={`font-medium ${cat.is_active ? "text-ink" : "text-ink-faint line-through"}`}>{cat.name}</span>
                {/* What is set here, without having to open each editor. */}
                <span className="text-xs text-ink-faint">
                  {[
                    cat.notice_hours != null ? `${cat.notice_hours}h notice` : null,
                    cat.bulk_threshold != null ? `bulk over ${cat.bulk_threshold}` : null,
                    cat.weight_multipliers?.length
                      ? `weights: ${cat.weight_multipliers.map((m) => m.label).join(", ")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Uses the site defaults"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggleActive(cat)}>
                {cat.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setSaveError(null);
                setEditing(cat);
                setName(cat.name);
                setNoticeHours(cat.notice_hours);
                setBulkThreshold(cat.bulk_threshold);
                setMultiplierRows(
                  toMultiplierDrafts(cat.weight_multipliers).map((m) => ({
                    label: m.label,
                    amount: m.multiplier,
                  }))
                );
              }}>
                <Pencil size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {(editing || creating) && (
        <Modal open onClose={closeModal} title={editing ? "Edit Category" : "Add Category"} size="md">
          <div className="flex flex-col gap-4">
            <Input label="Category Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

            {/* Empty means "inherit the site default". That is deliberately
                different from 0, which means "no notice needed", so these
                cannot use the usual `parseInt(...) || 0` pattern. */}
            <Input
              label="Notice hours for this category (leave empty to inherit)"
              type="number"
              min={0}
              value={noticeHours ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                const n = Number.parseInt(raw, 10);
                setNoticeHours(raw === "" || Number.isNaN(n) ? null : Math.max(0, n));
              }}
            />
            <Input
              label="Bulk threshold for this category (leave empty to inherit)"
              type="number"
              min={1}
              value={bulkThreshold ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                const n = Number.parseInt(raw, 10);
                setBulkThreshold(raw === "" || Number.isNaN(n) ? null : Math.max(1, n));
              }}
            />
            <p className="-mt-2 text-xs text-ink-faint">
              These override the site defaults for every item in this category. An item
              can override them again on its own.
            </p>

            {/* Added by migration 00034 and, until now, editable only in SQL. */}
            <div className="border-t border-ink/8 pt-4">
              <OptionRowsEditor
                label="Weights, priced from the base price"
                amountLabel="× base price"
                labelPlaceholder="1 kg"
                amountStep="0.5"
                rows={multiplierRows}
                onChange={setMultiplierRows}
                hint="Every made-to-order item in this category is offered at these weights, each priced by multiplying its base price. The sponge cakes use ½ kg × 1, 1 kg × 2, 2 kg × 4, so raising a cake's price lifts its kilo with it. Leave empty when the weights carry prices of their own, as the cheesecakes do."
              />
            </div>

            {saveError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
