import { describe, it, expect } from "vitest";
import { getEarliestValidSlot } from "./validation";
import { istInputToInstant, instantToIstInput, istDayName } from "@/lib/time/ist";

/**
 * The bakery's real schedule: open Mon-Sat 09:00-21:00, closed Sunday.
 *
 * These are the cases the client asked about directly — what a Saturday
 * evening order can actually be given once Sunday is taken out of the week.
 * The answer is never "not possible"; it is always "the next open slot", and
 * these pin down which one for each situation.
 */
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
  d === null ? "NO SLOT" : `${istDayName(d)} ${instantToIstInput(d).slice(11)}`;

// 2026-09-04 Fri · 09-05 Sat · 09-06 Sun · 09-07 Mon · 09-08 Tue
describe("Sunday closed: what the notice window actually yields", () => {
  it("bulk order placed Saturday 18:00 rolls past Sunday to Monday opening", () => {
    // +24h lands Sunday 18:00, which is shut, so Monday 09:00 is the answer.
    expect(show(getEarliestValidSlot(24, HOURS, [], at("2026-09-05T18:00")))).toBe(
      "monday 09:00"
    );
  });

  it("bulk order placed Saturday 09:00 still lands Monday, not Sunday", () => {
    expect(show(getEarliestValidSlot(24, HOURS, [], at("2026-09-05T09:00")))).toBe(
      "monday 09:00"
    );
  });

  it("bulk order placed Friday 09:00 lands Saturday, the last open day", () => {
    expect(show(getEarliestValidSlot(24, HOURS, [], at("2026-09-04T09:00")))).toBe(
      "saturday 09:00"
    );
  });

  it("standard 2h order placed Saturday 20:00 spills past closing to Monday", () => {
    // 20:00 + 2h = 22:00, past the 21:00 close, and Sunday is shut.
    expect(show(getEarliestValidSlot(2, HOURS, [], at("2026-09-05T20:00")))).toBe(
      "monday 09:00"
    );
  });

  it("standard 2h order placed Saturday 10:00 is same-day", () => {
    expect(show(getEarliestValidSlot(2, HOURS, [], at("2026-09-05T10:00")))).toBe(
      "saturday 12:00"
    );
  });

  it("an order placed on Sunday itself lands Monday", () => {
    expect(show(getEarliestValidSlot(2, HOURS, [], at("2026-09-06T10:00")))).toBe(
      "monday 09:00"
    );
  });

  it("custom cake (5 days) from Saturday absorbs the Sunday inside the window", () => {
    // +120h from Sat 18:00 is Thursday 18:00, an open day, so it stands.
    expect(show(getEarliestValidSlot(120, HOURS, [], at("2026-09-05T18:00")))).toBe(
      "thursday 18:00"
    );
  });

  it("a holiday on the Monday pushes a Saturday-evening bulk order to Tuesday", () => {
    expect(
      show(getEarliestValidSlot(24, HOURS, ["2026-09-07"], at("2026-09-05T18:00")))
    ).toBe("tuesday 09:00");
  });
});
