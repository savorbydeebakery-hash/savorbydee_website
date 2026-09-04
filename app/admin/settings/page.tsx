"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Check, Upload, X } from "lucide-react";
import { uploadFile } from "@/lib/storage/upload-helper";

export const dynamic = "force-dynamic";

interface SiteSettings {
  id: number;
  bakery_name: string;
  about_narrative: string;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_state: string | null;
  google_maps_embed_url: string | null;
  google_maps_directions_url: string | null;
  footer_text: string | null;
  global_notice_hours: number;
  bulk_threshold: number;
  bulk_notice_hours: number;
  custom_cake_notice_days: number;
  daily_menu_cutoff: string;
  instagram_url: string | null;
  facebook_url: string | null;
  delivery_from: string;
  delivery_to: string;
  free_delivery_threshold_cents: number;
  weekly_hours: Record<string, { open: boolean; from: string; to: string }>;
  holidays: string[];
  delivery_enabled: boolean;
  delivery_instructions: string | null;
  razorpay_active: boolean;
  kyc_pending_mode: boolean;
  upi_id: string | null;
  hero_image_url: string | null;
}

const TABS = [
  { id: "general", label: "General" },
  { id: "location", label: "Location" },
  { id: "notice", label: "Notice Rules" },
  { id: "hours", label: "Operating Hours" },
  { id: "delivery", label: "Delivery" },
  { id: "payment", label: "Payment" },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroStaged, setHeroStaged] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    setSettings(data as SiteSettings);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchSettings(); }, 0);
    return () => clearTimeout(id);
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(null);

    // Send only the editable columns (id stays the target for .eq).
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id,
      ...editable
    } = settings;

    const { error } = await supabase
      .from("site_settings")
      .update(editable)
      .eq("id", 1);

    setSaving(false);

    if (error) {
      setSaveError(`Could not save: ${error.message}`);
      setSaved(false);
      return;
    }

    setHeroStaged(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const update = (field: keyof SiteSettings, value: string | number | boolean | string[] | Record<string, unknown> | null) => {
    setSettings((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const updateHours = (day: string, field: "open" | "from" | "to", value: string | boolean) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const hours = { ...prev.weekly_hours };
      if (!hours[day]) hours[day] = { open: false, from: "09:00", to: "18:00" };
      hours[day] = { ...hours[day], [field]: value };
      return { ...prev, weekly_hours: hours };
    });
  };

  const addHoliday = (date: string) => {
    setSettings((prev) => prev ? { ...prev, holidays: [...prev.holidays, date] } : prev);
  };

  const removeHoliday = (date: string) => {
    setSettings((prev) => prev ? { ...prev, holidays: prev.holidays.filter((d) => d !== date) } : prev);
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setHeroUploading(true);
    setSaveError(null);
    const { url } = await uploadFile("site-assets", file, "hero");
    if (url) {
      setSettings({ ...settings, hero_image_url: url });
      setHeroStaged(true);
    }
    setHeroUploading(false);
  };

  if (loading || !settings) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Site Settings</h1>
        <Button onClick={handleSave} variant="primary" disabled={saving}>
          {saved ? <><Check size={18} /> Saved!</> : <><Save size={18} /> {saving ? "Saving..." : "Save"}</>}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-pink bg-pink-soft text-pink"
                : "border-ink/15 bg-white text-ink-soft hover:border-pink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === "general" && (
        <Card className="flex flex-col gap-4">
          <Input label="Bakery Name" value={settings.bakery_name} onChange={(e) => update("bakery_name", e.target.value)} />
          <Textarea label="About Narrative" value={settings.about_narrative} onChange={(e) => update("about_narrative", e.target.value)} rows={5} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Email" value={settings.contact_email ?? ""} onChange={(e) => update("contact_email", e.target.value)} />
            <Input label="Contact Phone" value={settings.contact_phone ?? ""} onChange={(e) => update("contact_phone", e.target.value)} />
          </div>
          <Input label="WhatsApp Number (with country code, no +)" value={settings.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Instagram URL" value={settings.instagram_url ?? ""} onChange={(e) => update("instagram_url", e.target.value)} placeholder="https://www.instagram.com/savorbydee" />
            <Input label="Facebook URL" value={settings.facebook_url ?? ""} onChange={(e) => update("facebook_url", e.target.value)} placeholder="https://www.facebook.com/savorbydee" />
          </div>
          <p className="-mt-2 text-xs text-ink-faint">
            Leaving one empty hides that icon from the footer.
          </p>
          <Input label="Footer Text" value={settings.footer_text ?? ""} onChange={(e) => update("footer_text", e.target.value)} />

          {/* Hero Image */}
          <div className="border-t border-ink/8 pt-4">
            <label className="mb-2 block text-sm font-medium text-ink">Hero Image</label>
            <p className="mb-3 text-xs text-ink-faint">Background photo for the homepage hero section. Leave empty to use the default bakery photo.</p>
            {settings.hero_image_url ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.hero_image_url} alt="Hero preview" className="h-40 w-full rounded-xl object-cover" />
                <button
                  onClick={() => update("hero_image_url", null)}
                  className="absolute right-2 top-2 rounded-full bg-ink/60 p-1 text-white hover:bg-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink/20 py-8 text-center hover:border-pink transition-colors">
                <Upload size={24} className="text-ink-faint" />
                <span className="text-sm text-ink-soft">{heroUploading ? "Uploading..." : "Click to upload hero image"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={heroUploading} />
              </label>
            )}
            {heroStaged && (
              <p className="mt-2 text-sm font-medium text-gold-deep">
                Hero image staged. Click <span className="font-semibold">Save</span> at the bottom to apply it.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Location */}
      {activeTab === "location" && (
        <Card className="flex flex-col gap-4">
          <Input label="Address Line 1" value={settings.address_line1 ?? ""} onChange={(e) => update("address_line1", e.target.value)} />
          <Input label="Address Line 2" value={settings.address_line2 ?? ""} onChange={(e) => update("address_line2", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={settings.address_city ?? ""} onChange={(e) => update("address_city", e.target.value)} />
            <Input label="State" value={settings.address_state ?? ""} onChange={(e) => update("address_state", e.target.value)} />
          </div>
          <Textarea label="Google Maps Embed URL" value={settings.google_maps_embed_url ?? ""} onChange={(e) => update("google_maps_embed_url", e.target.value)} rows={2} />
          <Input label="Google Maps Directions URL" value={settings.google_maps_directions_url ?? ""} onChange={(e) => update("google_maps_directions_url", e.target.value)} />
        </Card>
      )}

      {/* Notice Rules */}
      {activeTab === "notice" && (
        <Card className="flex flex-col gap-4">
          <div className="rounded-xl bg-pink-soft/50 p-3">
            <p className="text-sm text-ink-soft">Notice windows stack by MAX. The effective notice is the maximum of all applicable windows.</p>
          </div>
          <Input label="Global Notice (hours)" type="number" value={settings.global_notice_hours} onChange={(e) => update("global_notice_hours", parseInt(e.target.value) || 2)} />
          <Input label="Bulk Threshold (per item)" type="number" value={settings.bulk_threshold} onChange={(e) => update("bulk_threshold", parseInt(e.target.value) || 12)} />
          <p className="-mt-2 text-xs text-ink-faint">
            More than this many of any ONE item counts as a bulk order. At 12, ordering 13 of
            something triggers the bulk notice below; a basket of many different items never does.
          </p>
          <Input label="Bulk Notice (hours)" type="number" value={settings.bulk_notice_hours} onChange={(e) => update("bulk_notice_hours", parseInt(e.target.value) || 24)} />
          <Input label="Custom Cake Notice (max days)" type="number" value={settings.custom_cake_notice_days} onChange={(e) => update("custom_cake_notice_days", parseInt(e.target.value) || 5)} />
        </Card>
      )}

      {/* Operating Hours */}
      {activeTab === "hours" && (
        <Card className="flex flex-col gap-4">
          {DAYS.map((day) => {
            const hours = settings.weekly_hours?.[day] ?? { open: false, from: "09:00", to: "18:00" };
            return (
              <div key={day} className="flex items-center gap-3">
                <label className="flex w-24 items-center gap-2 text-sm font-medium text-ink capitalize">
                  <input type="checkbox" checked={hours.open} onChange={(e) => updateHours(day, "open", e.target.checked)} />
                  {day}
                </label>
                {hours.open && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={hours.from} onChange={(e) => updateHours(day, "from", e.target.value)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm" />
                    <span className="text-ink-faint">to</span>
                    <input type="time" value={hours.to} onChange={(e) => updateHours(day, "to", e.target.value)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm" />
                  </div>
                )}
                {!hours.open && <Badge color="neutral">Closed</Badge>}
              </div>
            );
          })}

          {/* Daily menu cutoff */}
          <div className="border-t border-ink/8 pt-4">
            <label className="mb-1 block text-sm font-medium text-ink">
              Daily menu closes at
            </label>
            <p className="mb-2 text-xs text-ink-faint">
              Today&rsquo;s bakes stop being orderable at this time, so the last of them can be
              handed over before you close. Preorders are not affected. Never later than the
              day&rsquo;s closing time.
            </p>
            <input
              type="time"
              value={settings.daily_menu_cutoff ?? "20:30"}
              onChange={(e) => update("daily_menu_cutoff", e.target.value)}
              className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm"
            />
          </div>

          {/* Holidays */}
          <div className="border-t border-ink/8 pt-4">
            <h3 className="font-semibold text-ink mb-3">Holidays</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.holidays?.map((date) => (
                <div key={date} className="flex items-center gap-1 rounded-lg bg-pink-soft px-3 py-1 text-sm">
                  <span className="text-ink">{date}</span>
                  <button onClick={() => removeHoliday(date)} className="text-ink-faint hover:text-red-500">×</button>
                </div>
              ))}
              {(!settings.holidays || settings.holidays.length === 0) && (
                <p className="text-sm text-ink-faint">No holidays set</p>
              )}
            </div>
            <div className="flex gap-2">
              <input type="date" id="new-holiday-date" className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm" />
              <Button size="sm" variant="outline" onClick={() => {
                const input = document.getElementById("new-holiday-date") as HTMLInputElement;
                if (input.value) addHoliday(input.value);
                input.value = "";
              }}>Add Holiday</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Delivery */}
      {activeTab === "delivery" && (
        <Card className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={settings.delivery_enabled} onChange={(e) => update("delivery_enabled", e.target.checked)} />
            Enable Delivery
          </label>
          <Textarea label="Delivery Instructions" value={settings.delivery_instructions ?? ""} onChange={(e) => update("delivery_instructions", e.target.value)} rows={3} />

          <div className="border-t border-ink/8 pt-4">
            <label className="mb-1 block text-sm font-medium text-ink">Delivery hours</label>
            <p className="mb-2 text-xs text-ink-faint">
              Narrower than your opening hours. A collection slot outside this window is
              still fine &mdash; this only limits delivery.
            </p>
            <div className="flex items-center gap-2">
              <input type="time" value={settings.delivery_from ?? "10:00"} onChange={(e) => update("delivery_from", e.target.value)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm" />
              <span className="text-ink-faint">to</span>
              <input type="time" value={settings.delivery_to ?? "20:00"} onChange={(e) => update("delivery_to", e.target.value)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm" />
            </div>
          </div>

          <div className="border-t border-ink/8 pt-4">
            <Input
              label="Free delivery over (₹)"
              type="number"
              min={0}
              value={Math.round((settings.free_delivery_threshold_cents ?? 0) / 100)}
              onChange={(e) => update("free_delivery_threshold_cents", (parseInt(e.target.value) || 0) * 100)}
            />
            <p className="mt-1 text-xs text-ink-faint">
              Orders at or above this total get delivery free automatically &mdash; the fee is
              recorded as ₹0 instead of waiting for you to quote one.
            </p>
          </div>
        </Card>
      )}

      {/* Payment */}
      {activeTab === "payment" && (
        <Card className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={settings.razorpay_active} onChange={(e) => update("razorpay_active", e.target.checked)} />
            Enable Razorpay
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={settings.kyc_pending_mode} onChange={(e) => update("kyc_pending_mode", e.target.checked)} />
            KYC Pending Mode (show UPI fallback)
          </label>
          <Input label="UPI ID" value={settings.upi_id ?? ""} onChange={(e) => update("upi_id", e.target.value)} placeholder="savorbakery@upi" />
          <div className="rounded-xl bg-yellow-soft/50 p-3">
            <p className="text-sm text-ink-soft">Razorpay keys are set via environment variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), not stored in the database.</p>
          </div>
        </Card>
      )}

      {/* Save bar — bottom of form */}
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Save changes</p>
          <p className="text-xs text-ink-faint">Applies across all tabs (including hero image) to the live site.</p>
        </div>
        {saveError ? (
          <p className="text-sm font-medium text-red-600">{saveError}</p>
        ) : null}
        <div className="flex items-center gap-3">
          {heroStaged && (
            <span className="rounded-lg bg-yellow-soft px-3 py-1 text-xs font-medium text-gold-deep">
              Unsaved changes
            </span>
          )}
          <Button onClick={handleSave} variant="primary" disabled={saving}>
            {saved ? <><Check size={18} /> Saved!</> : <><Save size={18} /> {saving ? "Saving..." : "Save Changes"}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
