import { describe, it, expect } from "vitest";
import { dayWindow, pruneOverrides, readOverrides } from "./hours-override";
import { getOpenState } from "./open-state";
import { getEarliestValidSlot, validateSlotAgainstHours, type WeeklyHours } from "@/lib/cart/validation";

const day = { open: true, from: "09:00", to: "21:00" };
const WEEKLY: WeeklyHours = {
  monday: day, tuesday: day, wednesday: day, thursday: day, friday: day, saturday: day,
  sunday: { open: false, from: "09:00", to: "21:00" },
};
const at = (iso: string) => new Date(`${iso}+05:30`);
// 2026-10-28 is a Wednesday; 2026-11-01 a Sunday.
const WED = "2026-10-28";

describe("dayWindow", () => {
  it("uses the weekly hours when nothing is changed", () => {
    expect(dayWindow(WED, WEEKLY, new Set())).toEqual({ open: 540, close: 1260, changed: false });
  });
  it("close early / open late / closed / special hours", () => {
    expect(dayWindow(WED, WEEKLY, new Set(), { [WED]: { to: "15:00" } })).toEqual({ open: 540, close: 900, changed: true });
    expect(dayWindow(WED, WEEKLY, new Set(), { [WED]: { from: "11:30" } })).toEqual({ open: 690, close: 1260, changed: true });
    expect(dayWindow(WED, WEEKLY, new Set(), { [WED]: { closed: true } })).toBeNull();
    expect(dayWindow(WED, WEEKLY, new Set(), { [WED]: { from: "10:00", to: "14:00" } })).toEqual({ open: 600, close: 840, changed: true });
  });
  it("closing before opening means closed all day", () => {
    expect(dayWindow(WED, WEEKLY, new Set(), { [WED]: { to: "08:00" } })).toBeNull();
  });
  it("can open a normally closed day, but only with both times", () => {
    expect(dayWindow("2026-11-01", WEEKLY, new Set(), { "2026-11-01": { from: "10:00", to: "14:00" } })).toEqual({ open: 600, close: 840, changed: true });
    expect(dayWindow("2026-11-01", WEEKLY, new Set(), { "2026-11-01": { to: "14:00" } })).toBeNull();
  });
  it("a holiday still wins", () => {
    expect(dayWindow(WED, WEEKLY, new Set([WED]), { [WED]: { from: "10:00", to: "14:00" } })).toBeNull();
  });
  it("only affects its own date", () => {
    expect(dayWindow("2026-10-29", WEEKLY, new Set(), { [WED]: { closed: true } })).toEqual({ open: 540, close: 1260, changed: false });
  });
});

describe("readOverrides / pruneOverrides", () => {
  it("drops malformed entries instead of closing the shop", () => {
    expect(readOverrides({ [WED]: { to: "3pm" }, "not-a-date": { closed: true }, "2026-10-29": { closed: true, note: " Sorry " } }))
      .toEqual({ "2026-10-29": { closed: true, note: "Sorry" } });
    expect(readOverrides(null)).toEqual({});
    expect(readOverrides("junk")).toEqual({});
  });
  it("forgets past dates", () => {
    expect(pruneOverrides({ "2026-10-27": { closed: true }, [WED]: { to: "15:00" } }, WED)).toEqual({ [WED]: { to: "15:00" } });
  });
});

describe("getOpenState with a change today", () => {
  it("closing early shuts the shop at that time, with her message", () => {
    const o = { [WED]: { to: "15:00", note: "Family emergency, sorry!" } };
    expect(getOpenState(WEEKLY, [], "20:30", at(`${WED}T14:59:00`), o).isOpen).toBe(true);
    const after = getOpenState(WEEKLY, [], "20:30", at(`${WED}T15:00:00`), o);
    expect(after.isOpen).toBe(false);
    expect(after.reason).toBe("changed-hours");
    expect(after.note).toBe("Family emergency, sorry!");
    expect(after.nextOpen?.toISOString()).toBe(at("2026-10-29T09:00:00").toISOString());
  });
  it("Today's Menu closes no later than the new closing time", () => {
    const s = getOpenState(WEEKLY, [], "20:30", at(`${WED}T14:00:00`), { [WED]: { to: "15:00" } });
    expect(s.dailyMenuClosesAt?.toISOString()).toBe(at(`${WED}T15:00:00`).toISOString());
  });
  it("opening late keeps it closed until then", () => {
    const s = getOpenState(WEEKLY, [], "20:30", at(`${WED}T10:00:00`), { [WED]: { from: "11:30" } });
    expect(s.isOpen).toBe(false);
    expect(s.reason).toBe("changed-hours");
    expect(s.nextOpen?.toISOString()).toBe(at(`${WED}T11:30:00`).toISOString());
  });
  it("closed all day points customers to the next normal day", () => {
    const s = getOpenState(WEEKLY, [], "20:30", at(`${WED}T12:00:00`), { [WED]: { closed: true } });
    expect(s.isOpen).toBe(false);
    expect(s.reason).toBe("changed-hours");
    expect(s.nextOpen?.toISOString()).toBe(at("2026-10-29T09:00:00").toISOString());
  });
  it("a change for tomorrow doesn't touch today", () => {
    expect(getOpenState(WEEKLY, [], "20:30", at(`${WED}T12:00:00`), { "2026-10-29": { closed: true } }).isOpen).toBe(true);
  });
});

describe("slots on a changed day", () => {
  const o = { [WED]: { to: "15:00" } };
  it("refuses times after the early close, with a clear reason", () => {
    const r = validateSlotAgainstHours(at(`${WED}T16:00:00`), WEEKLY, [], o);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/hours have changed.*9:00 am.*3:00 pm/);
    expect(validateSlotAgainstHours(at(`${WED}T14:00:00`), WEEKLY, [], o).valid).toBe(true);
  });
  it("refuses a day closed by a change", () => {
    const r = validateSlotAgainstHours(at(`${WED}T12:00:00`), WEEKLY, [], { [WED]: { closed: true } });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/closed on/);
  });
  it("the earliest-slot finder skips a closed day and respects an early close", () => {
    expect(getEarliestValidSlot(2, WEEKLY, [], at(`${WED}T08:00:00`), { [WED]: { closed: true } })?.toISOString())
      .toBe(at("2026-10-29T09:00:00").toISOString());
    // 2h notice from 13:30 lands at 15:30, after a 15:00 close: next morning.
    expect(getEarliestValidSlot(2, WEEKLY, [], at(`${WED}T13:30:00`), o)?.toISOString())
      .toBe(at("2026-10-29T09:00:00").toISOString());
  });
});
