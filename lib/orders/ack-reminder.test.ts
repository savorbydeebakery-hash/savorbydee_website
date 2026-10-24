import { describe, it, expect } from "vitest";
import { needsAckReminder, type AckReminderCandidate } from "./ack-reminder";

const T0 = Date.parse("2026-10-24T05:00:00Z");
const min = (n: number) => n * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** A pending, unacknowledged order placed at T0 whose new-order email went 5s later. */
function order(over: Partial<AckReminderCandidate> = {}): AckReminderCandidate {
  return {
    status: "pending",
    acknowledged_at: null,
    created_at: iso(T0),
    staff_email_sent_at: iso(T0 + 5_000),
    guest_name: "Asha",
    ...over,
  };
}

describe("needsAckReminder", () => {
  it("waits five minutes", () => {
    expect(needsAckReminder(order(), T0 + min(4))).toBe(false);
    expect(needsAckReminder(order(), T0 + min(5))).toBe(true);
  });

  it("reminds once: a later stamp means it already went", () => {
    const reminded = order({ staff_email_sent_at: iso(T0 + min(5)) });
    expect(needsAckReminder(reminded, T0 + min(6))).toBe(false);
  });

  it("still reminds when the new-order email never went out", () => {
    expect(needsAckReminder(order({ staff_email_sent_at: null }), T0 + min(5))).toBe(true);
  });

  it("leaves acknowledged, moved-on and old orders alone", () => {
    expect(needsAckReminder(order({ acknowledged_at: iso(T0 + min(1)) }), T0 + min(5))).toBe(false);
    expect(needsAckReminder(order({ status: "confirmed" }), T0 + min(5))).toBe(false);
    expect(needsAckReminder(order({ status: "cancelled" }), T0 + min(5))).toBe(false);
    expect(needsAckReminder(order(), T0 + min(61))).toBe(false);
  });

  it("never emails about the daily test run's orders", () => {
    expect(needsAckReminder(order({ guest_name: "E2E Test Customer" }), T0 + min(5))).toBe(false);
    expect(needsAckReminder(order({ guest_name: "Alarm Test" }), T0 + min(5))).toBe(false);
  });
});
