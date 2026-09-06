"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Pick one photograph out of the gallery.
 *
 * Deliberately a picker and not another upload box. These images front the two
 * menu cards on the homepage, and every one of them is already in the gallery —
 * asking the client to upload a second copy would leave two files to keep in
 * step and no way to tell which one the homepage is using.
 *
 * The thumbnails are the gallery's own order, so the shot the client is
 * looking for is where they last saw it.
 */
interface GalleryRow {
  id: string;
  image_url: string;
  caption: string | null;
}

export function GalleryPhotoPicker({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<GalleryRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gallery_photos")
      .select("id, image_url, caption")
      .eq("is_active", true)
      .order("sort_order");
    setPhotos((data as GalleryRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  // Only fetched once the client opens the picker. The gallery is 100 rows and
  // this control sits on a settings tab most visits never touch.
  useEffect(() => {
    if (!open || photos.length > 0) return;
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [open, photos.length, load]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink-soft">{label}</span>

      {value ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-28 w-40 rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Clear ${label}`}
            className="absolute right-2 top-2 rounded-full bg-ink/60 p-1 text-white transition-colors hover:bg-red-500"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink-faint">
          Nothing chosen — the homepage picks a gallery photo on its own.
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="self-start text-sm font-medium text-gold-deep underline underline-offset-4"
      >
        {open ? "Close the gallery" : value ? "Choose a different photo" : "Choose from the gallery"}
      </button>

      {open && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-ink/10 p-2">
          {loading ? (
            <p className="p-4 text-center text-sm text-ink-soft">Loading photos...</p>
          ) : photos.length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-soft">
              The gallery is empty. Add photos under Gallery first.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    onChange(photo.image_url);
                    setOpen(false);
                  }}
                  aria-label={photo.caption ?? "Gallery photo"}
                  aria-pressed={value === photo.image_url}
                  className={`overflow-hidden rounded-lg border-2 transition-colors ${
                    value === photo.image_url ? "border-gold-deep" : "border-transparent hover:border-ink/20"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.image_url} alt="" className="h-16 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
