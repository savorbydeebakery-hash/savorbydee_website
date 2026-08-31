import { describe, it, expect } from "vitest";
import { getOpenState } from "./open-state";
import { istInputToInstant, instantToIstInput, istDayName } from "@/lib/time/ist";

const HOURS = {
  monday: { open: true, from: "09:00", to: "21:00" },
  tuesday: { open: true, from: "09:00", to: "21:00" },
  wednesday: { open: true, from: "09:00", to: "21:00" },
  thursday: { open: true, from: "09:00", to: "21:00" },
  friday: { open: true, from: "09:00", to: "21:00" },
  saturday: { open: true, from: "09:00", to: "21:00" },
  sunday: { open: false, from: "09:00", to: "21:00" },
};

const at = (wall: string) => istInputToInstant(wall)!;
const show = (d: Date | null) =>
  d === null ? "NONE" : `${istDayName(d)} ${instantToIstInput(d).slice(11)}`;

// 2026-09-04 Fri · 09-05 Sat · 09-06 Sun · 09-07 Mon
describe("getOpenState", () => {
  it("is open mid-afternoon on a trading day", () => {
    const s = getOpenState(HOURS, [], "20:30", at("2026-09-04T15:00"));
    expect(s.isOpen).toBe(true);
    expect(s.reason).toBe("open");
    expect(s.dailyMenuOpen).toBe(true);
    expect(show(s.closesAt)).toBe("friday 21:00");
  });

  it("keeps the shop open but shuts the daily menu after the cutoff", () => {
    const s = getOpenState(HOURS, [], "20:30", at("2026-09-04T20:45"));
    expect(s.isOpen).toBe(true);
    expect(s.dailyMenuOpen).toBe(false);
    expect(show(s.dailyMenuClosesAt)).toBe("friday 20:30");
  });

  it("is still taking daily-menu orders one minute before the cutoff", () => {
    const s = getOpenState(HOURS, [], "20:30", at("2026-09-04T20:29"));
    expect(s.dailyMenuOpen).toBe(true);
  });

  it("closes at 21:00 and points at tomorrow morning", () => {
    const s = getOpenState(HOURS, [], "20:30", at("2026-09-04T21:00"));
    expect(s.isOpen).toBe(false);
    expect(s.reason).toBe("after-close");
    expect(show(s.nextOpen)).toBe("saturday 09:00");
  });

  it("skips Sunday when Saturday closes", () => {
    const s = getOpenState(HOURS, [], "20:30", at("2026-09-05T21:30"));
    expect(s.isOpen).toBe(false);
    expect(show(s.nextOpen)).toBe("monday 09:00");
  });

  it("reports a closed day on Sunday, pointing at Monday", () => {
    const s = getOpenState(HOURS, [], "20:30", at("2026-09-06T12:00"));
    expect(s.isOpen).toBe(false);
    expect(s.reason).toBe("closed-day");
    expect(show(s.nextOpen)).toBe("monday 09:00");
  });

  it("reports before-open in the early morning, same day", () => {
    const s = getOpenState(HOURS, [], "20:30", at("2026-09-07T07:00"));
    expect(s.isOpen).toBe(false);
    expect(s.reason).toBe("before-open");
    expect(show(s.nextOpen)).toBe("monday 09:00");
  });

  it("names a holiday as such and skips to the next trading day", () => {
    const s = getOpenState(HOURS, ["2026-09-07"], "20:30", at("2026-09-07T12:00"));
    expect(s.reason).toBe("holiday");
    expect(show(s.nextOpen)).toBe("tuesday 09:00");
  });

  it("treats an unconfigured schedule as open, never as permanently shut", () => {
    expect(getOpenState(null, [], "20:30", at("2026-09-06T12:00")).isOpen).toBe(true);
    expect(getOpenState({}, [], "20:30", at("2026-09-06T12:00")).isOpen).toBe(true);
  });

  it("falls back to the closing time when the cutoff is malformed", () => {
    const s = getOpenState(HOURS, [], "not-a-time", at("2026-09-04T20:45"));
    expect(s.dailyMenuOpen).toBe(true);
    expect(show(s.dailyMenuClosesAt)).toBe("friday 21:00");
  });

  it("never lets the cutoff outlast the close", () => {
    const s = getOpenState(HOURS, [], "23:00", at("2026-09-04T20:45"));
    expect(show(s.dailyMenuClosesAt)).toBe("friday 21:00");
  });

  it("returns no next-open when every day is shut", () => {
    const allClosed = Object.fromEntries(
      Object.keys(HOURS).map((d) => [d, { open: false, from: "09:00", to: "21:00" }])
    );
    expect(getOpenState(allClosed, [], "20:30", at("2026-09-07T12:00")).nextOpen).toBeNull();
  });
});
