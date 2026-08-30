"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { uploadFiles } from "@/lib/storage/upload-helper";
import { Upload, ArrowUp, ArrowDown, ImageOff } from "lucide-react";

export const dynamic = "force-dynamic";

interface Bts {
  id: string;
  label: string;
  caption: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * Behind the Scenes admin.
 *
 * The three rows are seeded by migration 00019, so this page is about filling
 * slots rather than creating them — there is no "Add" button by design. Each
 * card shows its photo or an explicit empty state, and the homepage section
 * stays hidden until at least one has an image.
 */
export default function AdminBtsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Bts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from("behind_the_scenes")
      .select("*")
      .order("sort_order");

    if (error) {
      setError(
        error.code === "42P01" || error.code === "PGRST205"
          ? "The behind_the_scenes table is not set up on this database yet. Apply migration 00019_behind_the_scenes.sql, then reload."
          : `Could not load: ${error.message}`
      );
    } else {
      setError(null);
      setRows((data as Bts[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchRows(); }, 0);
    return () => clearTimeout(id);
  }, [fetchRows]);

  const upload = async (row: Bts, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusyId(row.id);
    setError(null);
    const [result] = await uploadFiles("site-assets", [file]);
    if (!result?.url || result.error) {
      setError(`Upload failed: ${result?.error ?? "unknown error"}`);
      setBusyId(null);
      return;
    }
    await supabase
      .from("behind_the_scenes")
      .update({ image_url: result.url })
      .eq("id", row.id);
    setBusyId(null);
    void fetchRows();
  };

  const save = async (row: Bts, patch: Partial<Bts>) => {
    await supabase.from("behind_the_scenes").update(patch).eq("id", row.id);
    void fetchRows();
  };

  const move = async (row: Bts, dir: "up" | "down") => {
    const swap = rows.find(
      (o) => o.sort_order === row.sort_order + (dir === "up" ? -1 : 1)
    );
    if (!swap) return;
    await supabase.from("behind_the_scenes").update({ sort_order: row.sort_order }).eq("id", swap.id);
    await supabase.from("behind_the_scenes").update({ sort_order: swap.sort_order }).eq("id", row.id);
    void fetchRows();
  };

  if (loading) return <div className="py-20 text-center text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Behind the Scenes</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Three photos of the work itself. The section stays hidden on the
          homepage until at least one has a photo, so nothing looks broken while
          you gather them.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <Card key={row.id} className={`p-4 ${row.is_active ? "" : "opacity-55"}`}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="w-full shrink-0 sm:w-44">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-pink-soft">
                  {row.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.image_url} alt={row.label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-faint">
                      <ImageOff size={22} />
                      <span className="text-xs">No photo yet</span>
                    </div>
                  )}
                </div>
                <label className="mt-2 block">
                  <Button size="sm" variant="ghost" disabled={busyId === row.id} className="w-full">
                    <Upload size={15} />
                    {busyId === row.id ? "Uploading..." : row.image_url ? "Replace" : "Upload photo"}
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={busyId === row.id}
                    onChange={(e) => upload(row, e)}
                  />
                </label>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                <Input
                  label="Label"
                  defaultValue={row.label}
                  onBlur={(e) =>
                    e.target.value !== row.label && save(row, { label: e.target.value })
                  }
                />
                <Textarea
                  label="Caption"
                  rows={3}
                  defaultValue={row.caption ?? ""}
                  onBlur={(e) =>
                    e.target.value !== (row.caption ?? "") &&
                    save(row, { caption: e.target.value })
                  }
                />
                <div className="flex items-center gap-1">
                  <button onClick={() => move(row, "up")} aria-label="Move up" className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5">
                    <ArrowUp size={15} />
                  </button>
                  <button onClick={() => move(row, "down")} aria-label="Move down" className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5">
                    <ArrowDown size={15} />
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => save(row, { is_active: !row.is_active })}>
                    {row.is_active ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {rows.length === 0 && !error && (
          <div className="py-12 text-center text-ink-faint">
            No rows found. Migration 00019 seeds the three stages — apply it and reload.
          </div>
        )}
      </div>
    </div>
  );
}
