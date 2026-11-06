"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describeWriteError } from "@/lib/admin/write-error";
import { folderNameProblem, folderSlug, MAX_FOLDER_NAME, type GalleryFolder } from "@/lib/gallery/folders";

/**
 * Add, rename, reorder and delete the gallery's folders (client, 2026-11-06). Deleting
 * one never deletes photos: the database files them back under "not in a folder".
 */
export function GalleryFoldersManager({
  supabase,
  folders,
  photoCount,
  onChange,
  onDeleted,
  onClose,
}: {
  supabase: SupabaseClient;
  folders: GalleryFolder[];
  photoCount: (slug: string) => number;
  onChange: (folders: GalleryFolder[]) => void;
  onDeleted: (slug: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failed = (e: { message: string; code?: string }, what: string) =>
    setError(
      e.code === "PGRST205" || /gallery_folders/.test(e.message)
        ? "Adding your own folders needs a one-time database update first (migration 00059). Ask your developer."
        : e.code === "23505"
          ? "There's already a folder with that name."
          : describeWriteError(e, what)
    );

  const add = async () => {
    const problem = folderNameProblem(newName, folders);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const row = {
      slug: folderSlug(newName.trim(), folders.map((f) => f.slug)),
      label: newName.trim(),
      sort_order: folders.reduce((max, f) => Math.max(max, f.sort_order), 0) + 1,
    };
    const { data, error: e } = await supabase.from("gallery_folders").insert(row).select().single();
    setBusy(false);
    if (e) return failed(e, "the new folder");
    onChange([...folders, data as GalleryFolder]);
    setNewName("");
  };

  const rename = async (folder: GalleryFolder) => {
    const problem = folderNameProblem(editName, folders.filter((f) => f.slug !== folder.slug));
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from("gallery_folders").update({ label: editName.trim() }).eq("slug", folder.slug);
    setBusy(false);
    if (e) return failed(e, "the new name");
    onChange(folders.map((f) => (f.slug === folder.slug ? { ...f, label: editName.trim() } : f)));
    setEditing(null);
  };

  const move = async (index: number, by: -1 | 1) => {
    const a = folders[index], b = folders[index + by];
    if (!a || !b) return;
    setBusy(true);
    setError(null);
    // Swapped one at a time; if the second fails the order is only half changed, which
    // the reload below puts right on screen.
    const first = await supabase.from("gallery_folders").update({ sort_order: b.sort_order }).eq("slug", a.slug);
    const second = first.error ? first : await supabase.from("gallery_folders").update({ sort_order: a.sort_order }).eq("slug", b.slug);
    setBusy(false);
    if (first.error || second.error) {
      failed((first.error ?? second.error)!, "the new order");
      const { data } = await supabase.from("gallery_folders").select("slug, label, sort_order").order("sort_order");
      if (data) onChange(data as GalleryFolder[]);
      return;
    }
    const next = [...folders];
    next[index] = { ...b, sort_order: a.sort_order };
    next[index + by] = { ...a, sort_order: b.sort_order };
    onChange(next);
  };

  const remove = async (folder: GalleryFolder) => {
    const count = photoCount(folder.slug);
    const message = count
      ? `Delete the folder "${folder.label}"? Its ${count} photo${count === 1 ? "" : "s"} stay in the gallery, under "Not in a folder".`
      : `Delete the folder "${folder.label}"?`;
    if (!window.confirm(message)) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from("gallery_folders").delete().eq("slug", folder.slug);
    setBusy(false);
    if (e) return failed(e, "that folder");
    onChange(folders.filter((f) => f.slug !== folder.slug));
    onDeleted(folder.slug);
  };

  return (
    <Modal open onClose={onClose} title="Manage folders" size="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          The order here is the order customers see. Folders with nothing in them stay hidden from customers.
        </p>

        <ul className="flex flex-col divide-y divide-ink/8 rounded-xl border border-ink/10" aria-label="Folders">
          {folders.map((folder, i) => (
            <li key={folder.slug} className="flex flex-wrap items-center gap-2 px-3 py-2">
              {editing === folder.slug ? (
                <>
                  <input
                    aria-label={`New name for ${folder.label}`}
                    value={editName}
                    maxLength={MAX_FOLDER_NAME}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void rename(folder);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-ink/15 px-2 py-1 text-sm text-ink"
                  />
                  <Button size="sm" variant="primary" disabled={busy} onClick={() => void rename(folder)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {folder.label} <span className="text-ink-faint">({photoCount(folder.slug)})</span>
                  </span>
                  <button type="button" disabled={busy || i === 0} onClick={() => void move(i, -1)} aria-label={`Move ${folder.label} up`} className="rounded-lg p-1 text-ink-soft hover:bg-pink-soft disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" disabled={busy || i === folders.length - 1} onClick={() => void move(i, 1)} aria-label={`Move ${folder.label} down`} className="rounded-lg p-1 text-ink-soft hover:bg-pink-soft disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => { setError(null); setEditing(folder.slug); setEditName(folder.label); }}>
                    Rename
                  </Button>
                  <button type="button" disabled={busy} onClick={() => void remove(folder)} aria-label={`Delete ${folder.label}`} className="rounded-lg p-1 text-red-500 hover:bg-red-50 disabled:opacity-30">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
          {folders.length === 0 && <li className="px-3 py-4 text-sm text-ink-faint">No folders yet.</li>}
        </ul>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <div className="flex-1">
            <Input label="New folder" value={newName} maxLength={MAX_FOLDER_NAME} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Bento Cakes" />
          </div>
          <Button type="submit" variant="primary" disabled={busy || !newName.trim()}>Add folder</Button>
        </form>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
