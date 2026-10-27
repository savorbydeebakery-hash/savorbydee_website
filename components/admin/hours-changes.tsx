"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, X, AlertTriangle, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { WeeklyHours } from "@/lib/cart/validation";
import {
  dayWindow,
  pruneOverrides,
  readOverrides,
  type HoursOverride,
  type HoursOverrides,
} from "@/lib/shop/hours-override";
import { IST_OFFSET, formatClock, formatIst, istDateKey, istMinutesOfDay } from "@/lib/time/ist";
import { describeWriteError } from "@/lib/admin/write-error";

/**
 * Today's hours, and one-day changes for emergencies (admins only).
 *
 * Close now, close early, open late, closed all day, or special hours, for
 * today or any day in the next 60. Each change belongs to its own date and
 * lapses by itself (lib/shop/hours-override.ts), and it applies everywhere at
 * once: the closed banner, the menu, checkout and the order API.
 *
 * Safety:
 *  - a preview of exactly what customers will see, before saving;
 *  - orders already booked for times that become closed are listed with a
 *    WhatsApp link — they are not cancelled automatically;
 *  - impossible changes are refused (closing before opening, past dates);
 *  - the latest saved changes are re-read just before saving, so two people
 *    editing at once can't wipe out each other's change.
 */

type Mode = "close-early" | "open-late" | "closed" | "special";

const MODE_LABEL: Record<Mode, string> = {
  "close-early": "Close early",
  "open-late": "Open late",
  closed: "Closed all day",
  special: "Special hours (both times)",
};

const SUGGESTED_NOTE: Record<Mode, string> = {
  "close-early": "We're closing early today due to unforeseen circumstances. Sorry!",
  "open-late": "We're opening a little later today.",
  closed: "We're closed today due to unforeseen circumstances. Sorry!",
  special: "Our hours are different today.",
};

const MAX_DAYS_AHEAD = 60;

interface AffectedOrder {
  human_id: string;
  guest_name: string | null;
  guest_phone: string | null;
  requested_slot: string;
}

const noon = (key: string) => new Date(`${key}T12:00:00${IST_OFFSET}`);
const dayLabel = (key: string) => formatIst(noon(key), { weekday: "short", day: "numeric", month: "short" });
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const addDays = (key: string, n: number) => istDateKey(noon(key).getTime() + n * 86_400_000);

export function HoursChanges() {
  const supabase = useMemo(() => createClient(), []);
  const [weekly, setWeekly] = useState<WeeklyHours | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<HoursOverrides>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The form
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [mode, setMode] = useState<Mode>("close-early");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [affected, setAffected] = useState<AffectedOrder[] | null>(null);
  const [saving, setSaving] = useState(false);

  const todayKey = istDateKey(new Date());

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("site_settings")
      .select("weekly_hours, holidays, hours_overrides")
      .eq("id", 1)
      .single();
    if (e || !data) {
      setError("Couldn't load the opening hours. Refresh to try again.");
      return null;
    }
    setWeekly((data.weekly_hours as WeeklyHours | null) ?? null);
    setHolidays((data.holidays as string[] | null) ?? []);
    const o = readOverrides(data.hours_overrides);
    setOverrides(o);
    setLoaded(true);
    return o;
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const windowOn = useCallback(
    (key: string, o: HoursOverrides = overrides) => dayWindow(key, weekly, new Set(holidays), o) ?? null,
    [weekly, holidays, overrides]
  );
  const normalWindow = useCallback((key: string) => windowOn(key, {}), [windowOn]);

  const describe = (key: string, o: HoursOverrides = overrides) => {
    const w = windowOn(key, o);
    return w ? `${formatClock(hhmm(w.open))} – ${formatClock(hhmm(w.close))}` : "Closed";
  };

  // ---- the change being drafted ----
  const draft = useMemo((): { change: HoursOverride | null; problem: string | null } => {
    if (!date) return { change: null, problem: null };
    if (date < todayKey) return { change: null, problem: "That date has passed." };
    if (date > addDays(todayKey, MAX_DAYS_AHEAD)) return { change: null, problem: `Choose a date within the next ${MAX_DAYS_AHEAD} days.` };
    const normal = normalWindow(date);
    const base: HoursOverride = { note: note.trim() || undefined };
    switch (mode) {
      case "closed":
        return { change: { ...base, closed: true }, problem: null };
      case "close-early": {
        if (!to) return { change: null, problem: "Choose the new closing time." };
        if (!normal) return { change: null, problem: "You're normally closed that day. Use Special hours to open." };
        if (Number(to.replace(":", "")) <= Number(hhmm(normal.open).replace(":", "")))
          return { change: null, problem: `That's before you open (${formatClock(hhmm(normal.open))}). Choose Closed all day instead.` };
        return { change: { ...base, to }, problem: null };
      }
      case "open-late": {
        if (!from) return { change: null, problem: "Choose the new opening time." };
        if (!normal) return { change: null, problem: "You're normally closed that day. Use Special hours to open." };
        if (Number(from.replace(":", "")) >= Number(hhmm(normal.close).replace(":", "")))
          return { change: null, problem: `That's after you close (${formatClock(hhmm(normal.close))}). Choose Closed all day instead.` };
        return { change: { ...base, from }, problem: null };
      }
      case "special":
        if (!from || !to) return { change: null, problem: "Choose both the opening and the closing time." };
        if (from >= to) return { change: null, problem: "The closing time must be after the opening time." };
        return { change: { ...base, from, to }, problem: null };
    }
  }, [date, mode, from, to, note, todayKey, normalWindow]);

  const previewOverrides = useMemo(
    () => (draft.change && date ? { ...overrides, [date]: draft.change } : overrides),
    [draft.change, date, overrides]
  );

  // Orders already booked on that date for times that would now be closed.
  useEffect(() => {
    if (!open || !date || !draft.change) return;
    let live = true;
    const start = new Date(`${date}T00:00:00${IST_OFFSET}`).toISOString();
    const end = new Date(`${addDays(date, 1)}T00:00:00${IST_OFFSET}`).toISOString();
    void supabase
      .from("orders")
      .select("human_id, guest_name, guest_phone, requested_slot, status")
      .gte("requested_slot", start)
      .lt("requested_slot", end)
      .not("status", "in", "(cancelled,fulfilled)")
      .then(({ data }) => {
        if (!live) return;
        const w = dayWindow(date, weekly, new Set(holidays), previewOverrides);
        setAffected(
          ((data ?? []) as AffectedOrder[]).filter((o) => {
            if (!w) return true;
            const m = istMinutesOfDay(o.requested_slot);
            return m < w.open || m >= w.close;
          })
        );
      });
    return () => {
      live = false;
    };
  }, [open, date, draft.change, previewOverrides, supabase, weekly, holidays]);

  const startChange = (key: string, m: Mode, preset: { from?: string; to?: string } = {}) => {
    setDate(key);
    setMode(m);
    setFrom(preset.from ?? "");
    setTo(preset.to ?? "");
    setNote(SUGGESTED_NOTE[m]);
    setAffected(null);
    setError(null);
    setOpen(true);
  };

  /** Close for the rest of today, from this minute. */
  const closeNow = () => {
    const w = normalWindow(todayKey);
    const nowM = istMinutesOfDay(new Date());
    if (!w || nowM <= w.open) startChange(todayKey, "closed");
    else startChange(todayKey, "close-early", { to: hhmm(nowM) });
  };

  const save = async () => {
    if (!draft.change || !date) return;
    setSaving(true);
    setError(null);
    // Re-read first: someone else may have changed another day meanwhile.
    const latest = (await load()) ?? overrides;
    const { data: auth } = await supabase.auth.getUser();
    const next = pruneOverrides(
      {
        ...latest,
        [date]: { ...draft.change, set_by: auth.user?.email ?? undefined, set_at: new Date().toISOString() },
      },
      todayKey
    );
    const { error: e } = await supabase.from("site_settings").update({ hours_overrides: next }).eq("id", 1);
    setSaving(false);
    if (e) {
      setError(describeWriteError(e, "the opening hours"));
      return;
    }
    setOverrides(next);
    setOpen(false);
  };

  const remove = async (key: string) => {
    if (!window.confirm(`Go back to the normal hours on ${dayLabel(key)}?`)) return;
    setError(null);
    const latest = (await load()) ?? overrides;
    const next = { ...latest };
    delete next[key];
    const { error: e } = await supabase
      .from("site_settings")
      .update({ hours_overrides: pruneOverrides(next, todayKey) })
      .eq("id", 1);
    if (e) {
      setError(describeWriteError(e, "the opening hours"));
      return;
    }
    setOverrides(pruneOverrides(next, todayKey));
  };

  if (!loaded) {
    return error ? <Card className="mb-6 text-sm text-red-700">{error}</Card> : null;
  }

  const upcoming = Object.keys(overrides)
    .filter((k) => k >= todayKey)
    .sort();
  const todayChanged = !!overrides[todayKey];

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock size={16} /> Today&rsquo;s hours · {dayLabel(todayKey)}
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {describe(todayKey)}
            {todayChanged && <span className="ml-2 text-xs font-medium text-gold-deep">changed</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={closeNow}>Close now</Button>
          <Button size="sm" variant="outline" onClick={() => startChange(todayKey, "close-early")}>Close early</Button>
          <Button size="sm" variant="outline" onClick={() => startChange(todayKey, "open-late")}>Open late</Button>
          <Button size="sm" variant="ghost" onClick={() => startChange(addDays(todayKey, 1), "closed")}>Change another day</Button>
        </div>
      </div>

      {upcoming.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-ink/8 pt-3">
          {upcoming.map((k) => (
            <li key={k} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-ink">
                <b>{dayLabel(k)}</b>: {describe(k)}
                <span className="text-ink-faint"> (normally {describe(k, {})})</span>
                {overrides[k].note && <span className="block text-xs text-ink-soft">&ldquo;{overrides[k].note}&rdquo;</span>}
                {overrides[k].set_by && <span className="block text-[11px] text-ink-faint">Set by {overrides[k].set_by}</span>}
              </span>
              <button type="button" onClick={() => void remove(k)} className="inline-flex items-center gap-1 text-xs text-ink-soft underline">
                <X size={12} /> Back to normal hours
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Change opening hours" size="md">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Date"
                type="date"
                value={date}
                min={todayKey}
                max={addDays(todayKey, MAX_DAYS_AHEAD)}
                onChange={(e) => setDate(e.target.value)}
              />
              <Select label="Change" value={mode} onChange={(e) => { setMode(e.target.value as Mode); setNote(SUGGESTED_NOTE[e.target.value as Mode]); }}>
                {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
                  <option key={m} value={m}>{MODE_LABEL[m]}</option>
                ))}
              </Select>
            </div>
            {date && <p className="-mt-2 text-xs text-ink-faint">Normally on {dayLabel(date)}: {describe(date, {})}</p>}

            {(mode === "open-late" || mode === "special") && (
              <Input label="Open at" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            )}
            {(mode === "close-early" || mode === "special") && (
              <Input label="Close at" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
            )}
            <Input
              label="Message for customers (shown while you're closed)"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
            />

            {draft.problem && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{draft.problem}</p>}

            {draft.change && date && (
              <div className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-ink">
                <p className="font-semibold">What customers will see on {dayLabel(date)}</p>
                <p className="mt-1">Hours: <b>{describe(date, previewOverrides)}</b> (normally {describe(date, {})})</p>
                <p className="mt-1">Orders are only accepted for times you&rsquo;re open, and the website shows your message while you&rsquo;re closed. It changes straight away.</p>
              </div>
            )}

            {affected && affected.length > 0 && (
              <div className="rounded-xl bg-yellow-soft px-4 py-3 text-sm text-ink">
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={14} /> {affected.length} order{affected.length === 1 ? " is" : "s are"} booked for times you&rsquo;ll be closed</p>
                <p className="mt-1 text-xs text-ink-soft">They are not cancelled automatically. Message each customer to move or cancel.</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {affected.map((o) => (
                    <li key={o.human_id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{o.human_id} · {o.guest_name ?? "Customer"} · {formatIst(o.requested_slot, { hour: "numeric", minute: "2-digit" })}</span>
                      {o.guest_phone && (
                        <a
                          href={`https://wa.me/${o.guest_phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-berry underline"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end gap-3 border-t border-ink/8 pt-4">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => void save()} disabled={!draft.change || saving}>
                {saving ? "Saving..." : "Save change"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
