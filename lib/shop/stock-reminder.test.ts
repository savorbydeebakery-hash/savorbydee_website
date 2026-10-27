import { describe, it, expect } from "vitest";
import { stockReminderDue } from "./stock-reminder";

const open9to9 = { open: 540, close: 1260 };
const due = (over: Partial<Parameters<typeof stockReminderDue>[0]>) =>
  stockReminderDue({ window: open9to9, nowMinutes: 600, setToday: false, remindedToday: false, ...over });

describe("stockReminderDue", () => {
  it("fires 30 minutes after opening, not before", () => {
    expect(due({ nowMinutes: 569 })).toBe(false); // 9:29
    expect(due({ nowMinutes: 570 })).toBe(true); // 9:30
  });
  it("not once the stock is set, or already reminded", () => {
    expect(due({ setToday: true })).toBe(false);
    expect(due({ remindedToday: true })).toBe(false);
  });
  it("not on a closed day, or after closing", () => {
    expect(due({ window: null })).toBe(false);
    expect(due({ nowMinutes: 1260 })).toBe(false);
  });
  it("follows an 'open late' change", () => {
    expect(due({ window: { open: 690, close: 1260 }, nowMinutes: 600 })).toBe(false); // opens 11:30
    expect(due({ window: { open: 690, close: 1260 }, nowMinutes: 720 })).toBe(true); // 12:00
  });
});
