"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { uploadFile } from "@/lib/storage/upload-helper";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

interface Banner {
  id: string;
  title: string;
  body_text: string | null;
  cta_text: string | null;
  cta_link: string | null;
  poster_image_url: string | null;
  position: string;
  start_date: string;
  end_date: string | null;
  is_dismissible: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function AdminBannersPage() {
  const supabase = createClient();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBanners = useCallback(async () => {
    const { data } = await supabase.from("promo_banners").select("*").order("sort_order");
    setBanners((data as Banner[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchBanners(); }, 0);
    return () => clearTimeout(id);
  }, [fetchBanners]);

  const handleSave = async (banner: Partial<Banner>) => {
    if (banner.id) {
      await supabase.from("promo_banners").update(banner).eq("id", banner.id);
    } else {
      await supabase.from("promo_banners").insert(banner);
    }
    setEditing(null);
    setCreating(false);
    fetchBanners();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("promo_banners").delete().eq("id", id);
    fetchBanners();
  };

  const toggleActive = async (banner: Banner) => {
    await supabase.from("promo_banners").update({ is_active: !banner.is_active }).eq("id", banner.id);
    fetchBanners();
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const result = await uploadFile("promo-banners", file);
    setUploading(false);
    return result.url;
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Promo Banners</h1>
        <Button onClick={() => setCreating(true)} variant="primary">
          <Plus size={18} /> Add Banner
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {banners.map((banner) => (
          <Card key={banner.id} className="flex items-center gap-4">
            {banner.poster_image_url && (
              <div className="h-16 w-24 overflow-hidden rounded-lg bg-pink-soft flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.poster_image_url} alt={banner.title} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-ink">{banner.title}</h3>
              {banner.body_text && <p className="text-xs text-ink-soft line-clamp-1">{banner.body_text}</p>}
              <div className="mt-1 flex gap-1">
                <Badge color="pink">{banner.position}</Badge>
                {!banner.is_active && <Badge color="neutral">Inactive</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggleActive(banner)}>
                {banner.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(banner)}>
                <Pencil size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(banner.id)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
        {banners.length === 0 && (
          <p className="text-center py-12 text-ink-faint">No banners yet. Create one!</p>
        )}
      </div>

      {(editing || creating) && (
        <BannerForm
          banner={editing}
          onSave={handleSave}
          onClose={() => { setEditing(null); setCreating(false); }}
          uploading={uploading}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}

function BannerForm({
  banner,
  onSave,
  onClose,
  uploading,
  onUpload,
}: {
  banner: Banner | null;
  onSave: (banner: Partial<Banner>) => void;
  onClose: () => void;
  uploading: boolean;
  onUpload: (file: File) => Promise<string | null>;
}) {
  const [form, setForm] = useState<Partial<Banner>>(
    banner ?? {
      title: "",
      body_text: "",
      cta_text: "",
      cta_link: "",
      poster_image_url: null,
      position: "homepage_hero",
      start_date: new Date().toISOString(),
      end_date: null,
      is_dismissible: true,
      is_active: true,
      sort_order: 0,
    }
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await onUpload(file);
      if (url) setForm({ ...form, poster_image_url: url });
    }
  };

  return (
    <Modal open onClose={onClose} title={banner ? "Edit Banner" : "Add Banner"} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
        {form.position === "homepage_hero" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-soft">Poster Image</label>
            {form.poster_image_url ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.poster_image_url} alt="Preview" className="h-32 w-48 rounded-xl object-cover" />
                <button type="button" onClick={() => setForm({ ...form, poster_image_url: null })} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/15 hover:border-pink">
                <div className="text-center">
                  <Upload className="mx-auto text-ink-faint" size={20} />
                  <span className="text-xs text-ink-faint">{uploading ? "Uploading..." : "Upload"}</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
            )}
          </div>
        )}

        <Input label="Title" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Textarea label="Body Text" value={form.body_text ?? ""} onChange={(e) => setForm({ ...form, body_text: e.target.value })} rows={2} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="CTA Text" value={form.cta_text ?? ""} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
          <Input label="CTA Link" value={form.cta_link ?? ""} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} placeholder="/menu" />
        </div>

        <Select label="Position" value={form.position ?? "homepage_hero"} onChange={(e) => setForm({ ...form, position: e.target.value })}>
          <option value="homepage_hero">Homepage Hero</option>
          <option value="menu_top">Menu Top</option>
          <option value="site_wide_strip">Site-wide Strip</option>
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="datetime-local" value={form.start_date ? new Date(form.start_date).toISOString().slice(0, 16) : ""} onChange={(e) => setForm({ ...form, start_date: new Date(e.target.value).toISOString() })} />
          <Input label="End Date (optional)" type="datetime-local" value={form.end_date ? new Date(form.end_date).toISOString().slice(0, 16) : ""} onChange={(e) => setForm({ ...form, end_date: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Active
        </label>

        <div className="flex justify-end gap-3 border-t border-ink/8 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
