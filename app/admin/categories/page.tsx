"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchCategories(); }, 0);
    return () => clearTimeout(id);
  }, [fetchCategories]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editing) {
      await supabase.from("categories").update({ name, sort_order: editing.sort_order, is_active: editing.is_active, notice_hours: noticeHours, bulk_threshold: bulkThreshold }).eq("id", editing.id);
    } else {
      const maxSort = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
      await supabase.from("categories").insert({ name, sort_order: maxSort + 1, is_active: true, notice_hours: noticeHours, bulk_threshold: bulkThreshold });
    }
    setEditing(null);
    setCreating(false);
    setName("");
    setNoticeHours(null);
    setBulkThreshold(null);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Menu items will become uncategorized.")) return;
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
  };

  const moveOrder = async (cat: Category, direction: "up" | "down") => {
    const swapWith = categories.find((c) => c.sort_order === cat.sort_order + (direction === "up" ? -1 : 1));
    if (!swapWith) return;
    await supabase.from("categories").update({ sort_order: cat.sort_order }).eq("id", swapWith.id);
    await supabase.from("categories").update({ sort_order: swapWith.sort_order }).eq("id", cat.id);
    fetchCategories();
  };

  const toggleActive = async (cat: Category) => {
    await supabase.from("categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    fetchCategories();
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Categories</h1>
        <Button onClick={() => { setCreating(true); setName(""); }} variant="primary">
          <Plus size={18} /> Add Category
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <button onClick={() => moveOrder(cat, "up")} className="text-ink-faint hover:text-ink"><ArrowUp size={14} /></button>
                <button onClick={() => moveOrder(cat, "down")} className="text-ink-faint hover:text-ink"><ArrowDown size={14} /></button>
              </div>
              <span className={`font-medium ${cat.is_active ? "text-ink" : "text-ink-faint line-through"}`}>{cat.name}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggleActive(cat)}>
                {cat.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(cat); setName(cat.name); setNoticeHours(cat.notice_hours); setBulkThreshold(cat.bulk_threshold); }}>
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
        <Modal open onClose={() => { setEditing(null); setCreating(false); setNoticeHours(null); setBulkThreshold(null); }} title={editing ? "Edit Category" : "Add Category"} size="sm">
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
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setEditing(null); setCreating(false); setNoticeHours(null); setBulkThreshold(null); }}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
