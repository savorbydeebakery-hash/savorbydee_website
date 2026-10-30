import { describe, it, expect } from "vitest";
import { openingAlertDue, openingAlertText } from "./opening-alert";

const window = { open: 9 * 60, close: 21 * 60 };

describe("openingAlertDue", () => {
  it("goes once the shop opens, when something is waiting", () => {
    expect(openingAlertDue({ window, nowMinutes: 9 * 60, sentToday: false, waiting: 2 })).toBe(true);
    expect(openingAlertDue({ window, nowMinutes: 9 * 60 + 40, sentToday: false, waiting: 1 })).toBe(true);
  });

  it("not before opening, after closing, or on a closed day", () => {
    expect(openingAlertDue({ window, nowMinutes: 8 * 60 + 59, sentToday: false, waiting: 2 })).toBe(false);
    expect(openingAlertDue({ window, nowMinutes: 21 * 60, sentToday: false, waiting: 2 })).toBe(false);
    expect(openingAlertDue({ window: null, nowMinutes: 10 * 60, sentToday: false, waiting: 2 })).toBe(false);
  });

  it("not twice, and not when nothing is waiting", () => {
    expect(openingAlertDue({ window, nowMinutes: 10 * 60, sentToday: true, waiting: 2 })).toBe(false);
    expect(openingAlertDue({ window, nowMinutes: 10 * 60, sentToday: false, waiting: 0 })).toBe(false);
  });
});

describe("openingAlertText", () => {
  it("counts orders and requests", () => {
    expect(openingAlertText(1, 0).title).toBe("🌙 1 order came in while we were closed");
    expect(openingAlertText(3, 1).title).toBe("🌙 3 orders and 1 custom cake request came in while we were closed");
    expect(openingAlertText(0, 2).title).toBe("🌙 2 custom cake requests came in while we were closed");
  });
});
