"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button, FileButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { uploadFiles, deleteFile } from "@/lib/storage/upload-helper";
import { Trash2, Upload, ArrowUp, ArrowDown, Play, Youtube } from "lucide-react";
import { youtubeIdFrom, youtubeThumb } from "@/lib/gallery/youtube";
import { describeWriteError } from "@/lib/admin/write-error";
import { reorderNeighbour, swappedSortOrders } from "@/lib/admin/reorder";

export const dynamic = "force-dynamic";

interface GalleryPhoto {
  id: string;
  /** Null for a YouTube video (migration 00055). */
  image_url: string | null;
  youtube_id?: string | null;
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
  // Every write here used to ignore its result, so a refused save looked
  // exactly like a successful one.
  const [listError, setListError] = useState<string | null>(null);
  const [captionError, setCaptionError] = useState<string | null>(null);
  // Photos the homepage is using right now, so deleting one can warn first.
  const [inUse, setInUse] = useState<Record<string, string>>({});
  // Add a YouTube video (client, 2026-10-31): the video stays on YouTube,
  // usually Unlisted, so it costs no storage here.
  const [addingVideo, setAddingVideo] = useState(false);
  const [videoLink, setVideoLink] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    const [{ data, error }, { data: settings }] = await Promise.all([
      supabase.from("gallery_photos").select("*").order("sort_order"),
      supabase
        .from("site_settings")
        .select("hero_image_url, daily_menu_image_url, preorder_menu_image_url, custom_order_image_url")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    if (error) setListError(describeWriteError(error, "the gallery"));
    setPhotos((data as GalleryPhoto[]) ?? []);

    const uses: Record<string, string> = {};
    const label: Record<string, string> = {
      hero_image_url: "the homepage hero",
      daily_menu_image_url: "the Today's Menu card",
      preorder_menu_image_url: "the Preorder Menu card",
      custom_order_image_url: "the Custom Order card",
    };
    for (const [key, where] of Object.entries(label)) {
      const url = (settings as Record<string, string | null> | null)?.[key];
      if (url) uses[url] = uses[url] ? `${uses[url]} and ${where}` : where;
    }
    setInUse(uses);
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

    // A file that failed to upload used to be filtered out without a word, so
    // choosing ten photos and getting eight looked like success.
    const failed = results.filter((r) => !r.url || r.error).length;
    setListError(null);

    if (newPhotos.length > 0) {
      const { error } = await supabase.from("gallery_photos").insert(newPhotos);
      if (error) {
        setListError(describeWriteError(error, "the new photos"));
      }
      fetchPhotos();
    }
    if (failed > 0) {
      setListError(
        `${failed} of ${files.length} photo${files.length === 1 ? "" : "s"} could not be uploaded. ${
          results.find((r) => r.error)?.error ?? "Try those again."
        }`
      );
    }
    setUploading(false);
    e.target.value = "";
  };

  const saveVideo = async () => {
    const id = youtubeIdFrom(videoLink);
    if (!id) {
      setVideoError("That doesn’t look like a YouTube link. Copy it from YouTube’s Share button and paste it here.");
      return;
    }
    setVideoError(null);
    const first = photos.reduce((min, p) => Math.min(min, p.sort_order), 0);
    const { error } = await supabase.from("gallery_photos").insert({
      youtube_id: id,
      image_url: null,
      caption: videoCaption.trim() || null,
      // First in the gallery: a new video is usually what she wants seen.
      sort_order: first - 1,
      is_active: true,
    });
    if (error) {
      setVideoError(
        /youtube_id|image_url|null value/i.test(error.message)
          ? "Videos need a one-time database update first (migration 00055). Ask your developer."
          : describeWriteError(error, "this video")
      );
      return;
    }
    setAddingVideo(false);
    setVideoLink("");
    setVideoCaption("");
    fetchPhotos();
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    // The homepage points at gallery photos by URL. Deleting one of those
    // leaves that card showing a broken image, so say so before it happens.
    const usedBy = photo.image_url ? inUse[photo.image_url] : undefined;
    const warning = usedBy
      ? `This photo is used on ${usedBy}. Deleting it will leave a broken image there until you pick another in Settings. Delete anyway?`
      : photo.youtube_id
        ? "Remove this video from the gallery? It stays on YouTube."
        : "Delete this photo?";
    if (!confirm(warning)) return;

    setListError(null);
    const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
    if (error) {
      // The file is only removed once the row is gone. This used to delete the
      // file regardless, so a refused delete left a gallery entry pointing at
      // an image that no longer existed.
      setListError(describeWriteError(error, "this photo"));
      return;
    }
    const path = photo.image_url?.split("/gallery/")[1];
    if (path) await deleteFile("gallery", path);
    fetchPhotos();
  };

  const moveOrder = async (photo: GalleryPhoto, direction: "up" | "down") => {
    // Neighbour in sort order, not sort_order ± 1 — see lib/admin/reorder.ts.
    const swapWith = reorderNeighbour(photos, photo, direction);
    if (!swapWith) return;
    const next = swappedSortOrders(photo, swapWith, direction);
    setListError(null);
    const first = await supabase
      .from("gallery_photos")
      .update({ sort_order: next.neighbour })
      .eq("id", swapWith.id);
    if (first.error) {
      setListError(describeWriteError(first.error, "the reorder"));
      return;
    }
    const second = await supabase
      .from("gallery_photos")
      .update({ sort_order: next.item })
      .eq("id", photo.id);
    if (second.error) setListError(describeWriteError(second.error, "the reorder"));
    fetchPhotos();
  };

  const toggleActive = async (photo: GalleryPhoto) => {
    setListError(null);
    const { error } = await supabase
      .from("gallery_photos")
      .update({ is_active: !photo.is_active })
      .eq("id", photo.id);
    if (error) {
      setListError(describeWriteError(error, "that change"));
      return;
    }
    fetchPhotos();
  };

  const saveCaption = async () => {
    if (!editingCaption) return;
    setCaptionError(null);
    const { error } = await supabase
      .from("gallery_photos")
      .update({ caption: captionText })
      .eq("id", editingCaption.id);
    if (error) {
      setCaptionError(describeWriteError(error, "this caption"));
      return;
    }
    setEditingCaption(null);
    setCaptionText("");
    fetchPhotos();
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Gallery</h1>
        {/* FileButton, not a Button inside a label — that opened no picker. */}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => { setVideoError(null); setAddingVideo(true); }}>
            <Youtube size={18} /> Add YouTube video
          </Button>
          <FileButton variant="primary" accept="image/*" multiple disabled={uploading} onFiles={handleUpload}>
            <Upload size={18} /> {uploading ? "Uploading..." : "Upload Photos"}
          </FileButton>
        </div>
      </div>

      {listError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="flex flex-col gap-2 p-3">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-soft">
              {/* Resized by Supabase and loaded as it scrolls into view. This
                  was a plain <img> of every original, so opening the page
                  pulled ~100 full-size phone photos and took ~40 seconds. */}
              {photo.youtube_id ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={youtubeThumb(photo.youtube_id)}
                    alt={photo.caption ?? "YouTube video"}
                    loading="lazy"
                    className={`h-full w-full object-cover ${!photo.is_active ? "opacity-40" : ""}`}
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white">
                      <Play size={18} fill="currentColor" aria-hidden="true" />
                    </span>
                  </span>
                </>
              ) : photo.image_url ? (
                <Image
                  src={photo.image_url}
                  alt={photo.caption ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
                  className={`object-cover ${!photo.is_active ? "opacity-40" : ""}`}
                />
              ) : null}
              <div className="absolute right-1 top-1 flex flex-col gap-1">
                <button onClick={() => moveOrder(photo, "up")} aria-label="Move photo earlier" className="rounded-lg bg-white/80 p-1 text-ink hover:bg-white"><ArrowUp size={14} /></button>
                <button onClick={() => moveOrder(photo, "down")} aria-label="Move photo later" className="rounded-lg bg-white/80 p-1 text-ink hover:bg-white"><ArrowDown size={14} /></button>
              </div>
            </div>
            {photo.caption && <p className="text-xs text-ink-soft truncate">{photo.caption}</p>}
            {photo.youtube_id && <p className="text-[11px] font-medium text-berry">YouTube video</p>}
            {photo.image_url && inUse[photo.image_url] && (
              <p className="text-[11px] font-medium text-gold-deep">On {inUse[photo.image_url]}</p>
            )}
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setEditingCaption(photo); setCaptionText(photo.caption ?? ""); }}>
                Caption
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleActive(photo)}>
                {photo.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(photo)} aria-label="Delete photo">
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

      {addingVideo && (
        <Modal open onClose={() => setAddingVideo(false)} title="Add a YouTube video" size="md">
          <div className="flex flex-col gap-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
              <li>Upload the video on YouTube and set it to <strong>Unlisted</strong>, so it only shows here.</li>
              <li>On the video, tap <strong>Share</strong> → <strong>Copy link</strong>.</li>
              <li>Paste the link below.</li>
            </ol>
            <Input
              label="YouTube link"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://youtu.be/…"
              autoFocus
            />
            {youtubeIdFrom(videoLink) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={youtubeThumb(youtubeIdFrom(videoLink)!)} alt="Video preview" className="aspect-video w-full rounded-xl object-cover" />
            )}
            <Input label="Caption (optional)" value={videoCaption} onChange={(e) => setVideoCaption(e.target.value)} placeholder="3-tier wedding cake" />
            {videoError && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{videoError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAddingVideo(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => void saveVideo()} disabled={!videoLink.trim()}>Add to gallery</Button>
            </div>
          </div>
        </Modal>
      )}

      {editingCaption && (
        <Modal open onClose={() => { setEditingCaption(null); setCaptionError(null); }} title="Edit Caption" size="sm">
          <div className="flex flex-col gap-4">
            <Input label="Caption" value={captionText} onChange={(e) => setCaptionText(e.target.value)} autoFocus />
            {captionError && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{captionError}</p>
            )}
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
