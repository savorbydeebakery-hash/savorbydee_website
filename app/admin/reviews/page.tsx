"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Trash2, Plus, ArrowUp, ArrowDown, Star } from "lucide-react";

export const dynamic = "force-dynamic";

interface Review {
  id: string;
  author_name: string;
  body: string;
  item_name: string | null;
  rating: number;
  is_active: boolean;
  sort_order: number;
}

/** A new row starts here; `id` is assigned by the database on insert. */
const BLANK = { author_name: "", body: "", item_name: "", rating: 5 };

export default function AdminReviewsPage() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Review | null>(null);
  const [draft, setDraft] = useState(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("sort_order");

    // The table arrives in migration 00017. Until that has been applied to
    // this environment the query fails, and a raw PostgREST string is not a
    // useful thing to show the client.
    if (error) {
      setError(
        error.message.includes("does not exist") ||
          error.code === "42P01" ||
          error.code === "PGRST205"
          ? "The reviews table is not set up on this database yet. Apply migration 00017_reviews.sql, then reload."
          : `Could not load reviews: ${error.message}`
      );
    } else {
      setError(null);
      setReviews((data as Review[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchReviews(); }, 0);
    return () => clearTimeout(id);
  }, [fetchReviews]);

  const openNew = () => {
    setDraft(BLANK);
    setEditing(null);
    setModalOpen(true);
  };

  const [modalOpen, setModalOpen] = useState(false);

  const openEdit = (r: Review) => {
    setDraft({
      author_name: r.author_name,
      body: r.body,
      item_name: r.item_name ?? "",
      rating: r.rating,
    });
    setEditing(r);
    setModalOpen(true);
  };

  const save = async () => {
    if (!draft.author_name.trim() || !draft.body.trim()) {
      setError("A review needs both a name and the review text.");
      return;
    }
    setSaving(true);
    setError(null);

    const row = {
      author_name: draft.author_name.trim(),
      body: draft.body.trim(),
      item_name: draft.item_name.trim() || null,
      rating: draft.rating,
    };

    const { error } = editing
      ? await supabase.from("reviews").update(row).eq("id", editing.id)
      : await supabase.from("reviews").insert({
          ...row,
          sort_order: reviews.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1,
          is_active: true,
        });

    setSaving(false);
    if (error) {
      setError(`Could not save: ${error.message}`);
      return;
    }
    setModalOpen(false);
    setEditing(null);
    void fetchReviews();
  };

  const remove = async (r: Review) => {
    if (!confirm(`Delete the review from ${r.author_name}?`)) return;
    await supabase.from("reviews").delete().eq("id", r.id);
    void fetchReviews();
  };

  const toggleActive = async (r: Review) => {
    await supabase.from("reviews").update({ is_active: !r.is_active }).eq("id", r.id);
    void fetchReviews();
  };

  const move = async (r: Review, dir: "up" | "down") => {
    const swap = reviews.find(
      (o) => o.sort_order === r.sort_order + (dir === "up" ? -1 : 1)
    );
    if (!swap) return;
    await supabase.from("reviews").update({ sort_order: r.sort_order }).eq("id", swap.id);
    await supabase.from("reviews").update({ sort_order: swap.sort_order }).eq("id", r.id);
    void fetchReviews();
  };

  if (loading) return <div className="py-20 text-center text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Reviews</h1>
          <p className="mt-1 text-sm text-ink-soft">
            These appear in the carousel on the homepage. The section is hidden
            entirely while there are none.
          </p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus size={18} /> Add Review
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <Card key={r.id} className={`p-4 ${r.is_active ? "" : "opacity-50"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-1 text-gold-deep">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < r.rating ? "currentColor" : "none"}
                      className={i < r.rating ? "" : "opacity-30"}
                    />
                  ))}
                </div>
                <p className="text-sm text-ink">{r.body}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {r.author_name}
                  {r.item_name ? ` — ${r.item_name}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => move(r, "up")} aria-label="Move up" className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5">
                  <ArrowUp size={15} />
                </button>
                <button onClick={() => move(r, "down")} aria-label="Move down" className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5">
                  <ArrowDown size={15} />
                </button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>
                  {r.is_active ? "Hide" : "Show"}
                </Button>
                <button onClick={() => remove(r)} aria-label="Delete" className="rounded-lg p-1.5 hover:bg-ink/5">
                  <Trash2 size={15} className="text-red-500" />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {reviews.length === 0 && !error && (
          <div className="py-12 text-center text-ink-faint">
            No reviews yet. Add the first one — use real customer words, not
            placeholders; these are shown publicly as genuine testimonials.
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} title={editing ? "Edit Review" : "Add Review"} size="md">
          <div className="flex flex-col gap-4">
            <Input
              label="Customer name"
              value={draft.author_name}
              onChange={(e) => setDraft({ ...draft, author_name: e.target.value })}
              autoFocus
            />
            <Textarea
              label="Review"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={4}
            />
            <Input
              label="What they ordered (optional)"
              value={draft.item_name}
              onChange={(e) => setDraft({ ...draft, item_name: e.target.value })}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Rating</span>
              <select
                value={draft.rating}
                onChange={(e) => setDraft({ ...draft, rating: parseInt(e.target.value) })}
                className="rounded-xl border border-ink/15 bg-porcelain px-3 py-2.5 text-sm text-ink"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
