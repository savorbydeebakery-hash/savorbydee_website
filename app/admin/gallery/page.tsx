"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { uploadFiles, deleteFile } from "@/lib/storage/upload-helper";
import { Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react";

export const dynamic = "force-dynamic";

interface GalleryPhoto {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function AdminGalleryPage() {
  const supabase = createClient();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState<GalleryPhoto | null>(null);
  const [captionText, setCaptionText] = useState("");

  const fetchPhotos = useCallback(async () => {
    const { data } = await supabase.from("gallery_photos").select("*").order("sort_order");
    setPhotos((data as GalleryPhoto[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchPhotos(); }, 0);
    return () => clearTimeout(id);
  }, [fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);

    const results = await uploadFiles("gallery", files);
    const maxSort = photos.reduce((max, p) => Math.max(max, p.sort_order), 0);

    const newPhotos = results
      .filter((r) => r.url && !r.error)
      .map((r, i) => ({
        image_url: r.url!,
        caption: "",
        sort_order: maxSort + i + 1,
        is_active: true,
      }));

    if (newPhotos.length > 0) {
      await supabase.from("gallery_photos").insert(newPhotos);
      fetchPhotos();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.from("gallery_photos").delete().eq("id", photo.id);
    const path = photo.image_url.split("/gallery/")[1];
    if (path) await deleteFile("gallery", path);
    fetchPhotos();
  };

  const moveOrder = async (photo: GalleryPhoto, direction: "up" | "down") => {
    const swapWith = photos.find((p) => p.sort_order === photo.sort_order + (direction === "up" ? -1 : 1));
    if (!swapWith) return;
    await supabase.from("gallery_photos").update({ sort_order: photo.sort_order }).eq("id", swapWith.id);
    await supabase.from("gallery_photos").update({ sort_order: swapWith.sort_order }).eq("id", photo.id);
    fetchPhotos();
  };

  const toggleActive = async (photo: GalleryPhoto) => {
    await supabase.from("gallery_photos").update({ is_active: !photo.is_active }).eq("id", photo.id);
    fetchPhotos();
  };

  const saveCaption = async () => {
    if (!editingCaption) return;
    await supabase.from("gallery_photos").update({ caption: captionText }).eq("id", editingCaption.id);
    setEditingCaption(null);
    setCaptionText("");
    fetchPhotos();
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Gallery</h1>
        <label>
          <Button variant="primary" disabled={uploading}>
            <Upload size={18} /> {uploading ? "Uploading..." : "Upload Photos"}
          </Button>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="flex flex-col gap-2 p-3">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.image_url} alt={photo.caption ?? ""} className={`h-full w-full object-cover ${!photo.is_active ? "opacity-40" : ""}`} />
              <div className="absolute right-1 top-1 flex flex-col gap-1">
                <button onClick={() => moveOrder(photo, "up")} className="rounded-lg bg-white/80 p-1 text-ink hover:bg-white"><ArrowUp size={14} /></button>
                <button onClick={() => moveOrder(photo, "down")} className="rounded-lg bg-white/80 p-1 text-ink hover:bg-white"><ArrowDown size={14} /></button>
              </div>
            </div>
            {photo.caption && <p className="text-xs text-ink-soft truncate">{photo.caption}</p>}
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setEditingCaption(photo); setCaptionText(photo.caption ?? ""); }}>
                Caption
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleActive(photo)}>
                {photo.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(photo)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
        {photos.length === 0 && (
          <div className="col-span-full text-center py-12 text-ink-faint">
            No photos yet. Upload some!
          </div>
        )}
      </div>

      {editingCaption && (
        <Modal open onClose={() => setEditingCaption(null)} title="Edit Caption" size="sm">
          <div className="flex flex-col gap-4">
            <Input label="Caption" value={captionText} onChange={(e) => setCaptionText(e.target.value)} autoFocus />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingCaption(null)}>Cancel</Button>
              <Button variant="primary" onClick={saveCaption}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
