import { describe, it, expect } from "vitest";
import {
  istInputToInstant,
  instantToIstInput,
  istDateKey,
  istInputAfterHours,
  formatIstSlot,
  formatIstDate,
  formatIstTime,
  istDayBounds,
  istDateParts,
  istDayName,
  istMinutesOfDay,
  parseClockMinutes,
} from "./ist";

// --- istInputToInstant ---

describe("istInputToInstant", () => {
  it("reads a naive picker value as IST, not as UTC", () => {
    // The exact bug: 06:07 picked in Shillong used to be stored as 06:07Z.
    expect(istInputToInstant("2026-09-01T06:07")?.toISOString()).toBe(
      "2026-09-01T00:37:00.000Z"
    );
  });

  it("accepts a naive value that carries seconds", () => {
    expect(istInputToInstant("2026-09-01T06:07:30")?.toISOString()).toBe(
      "2026-09-01T00:37:30.000Z"
    );
  });

  it("passes through a value that already carries a zone", () => {
    // An API client sending a real instant must not be shifted again.
    expect(istInputToInstant("2026-09-01T00:37:00.000Z")?.toISOString()).toBe(
      "2026-09-01T00:37:00.000Z"
    );
    expect(istInputToInstant("2026-09-01T06:07:00+05:30")?.toISOString()).toBe(
      "2026-09-01T00:37:00.000Z"
    );
  });

  it("crosses the date boundary correctly before 05:30 IST", () => {
    expect(istInputToInstant("2026-09-01T04:00")?.toISOString()).toBe(
      "2026-08-31T22:30:00.000Z"
    );
  });

  it("returns null rather than guessing on junk", () => {
    expect(istInputToInstant("")).toBeNull();
    expect(istInputToInstant("not a date")).toBeNull();
    expect(istInputToInstant("2026-13-01T06:07")).toBeNull();
    expect(istInputToInstant(null)).toBeNull();
    expect(istInputToInstant(undefined)).toBeNull();
  });
});

// --- instantToIstInput ---

describe("instantToIstInput", () => {
  it("round-trips a picker value", () => {
    const instant = istInputToInstant("2026-09-01T06:07")!;
    expect(instantToIstInput(instant)).toBe("2026-09-01T06:07");
  });

  it("renders a UTC instant in IST wall clock", () => {
    expect(instantToIstInput("2026-08-31T18:30:00.000Z")).toBe("2026-09-01T00:00");
  });

  it("is empty for an unusable value", () => {
    expect(instantToIstInput(null)).toBe("");
    expect(instantToIstInput("nope")).toBe("");
  });
});

// --- calendar helpers ---

describe("istDateKey", () => {
  it("uses the IST day, not the UTC day", () => {
    // 23:00 UTC on the 31st is already 04:30 on the 1st in IST.
    expect(istDateKey("2026-08-31T23:00:00.000Z")).toBe("2026-09-01");
  });
});

describe("istDayBounds", () => {
  it("brackets the IST calendar day", () => {
    const { start, end } = istDayBounds(new Date("2026-08-31T23:00:00.000Z"));
    expect(start).toBe("2026-08-31T18:30:00.000Z"); // 1 Sep 00:00 IST
    expect(end).toBe("2026-09-01T18:30:00.000Z"); // 2 Sep 00:00 IST
  });

  it("includes a slot just after IST midnight, which UTC bounds dropped", () => {
    const { start, end } = istDayBounds(new Date("2026-09-01T06:00:00.000Z"));
    const slot = istInputToInstant("2026-09-01T01:00")!.toISOString();
    expect(slot >= start && slot < end).toBe(true);
  });
});

describe("istDateParts", () => {
  it("stamps the IST day for an order placed just after IST midnight", () => {
    // 20:00 UTC on 31 Aug is 01:30 on 1 Sep in IST.
    expect(istDateParts(new Date("2026-08-31T20:00:00.000Z"))).toEqual({
      yy: "26",
      mm: "09",
      dd: "01",
    });
  });
});

describe("istDayName", () => {
  it("names the IST weekday", () => {
    // 2026-09-05 is a Saturday; 18:00 UTC is already Sunday in IST.
    expect(istDayName("2026-09-05T10:00:00.000Z")).toBe("saturday");
    expect(istDayName("2026-09-05T19:00:00.000Z")).toBe("sunday");
  });
});

describe("istMinutesOfDay", () => {
  it("counts minutes from IST midnight", () => {
    expect(istMinutesOfDay(istInputToInstant("2026-09-01T09:00"))).toBe(540);
    expect(istMinutesOfDay(istInputToInstant("2026-09-01T21:30"))).toBe(1290);
  });
});

describe("parseClockMinutes", () => {
  it("parses a settings clock string", () => {
    expect(parseClockMinutes("09:00")).toBe(540);
    expect(parseClockMinutes("9:05")).toBe(545);
  });

  it("is NaN on anything malformed", () => {
    expect(parseClockMinutes("")).toBeNaN();
    expect(parseClockMinutes("nine")).toBeNaN();
    expect(parseClockMinutes(null)).toBeNaN();
  });
});

// --- formatting ---

describe("formatIst*", () => {
  const instant = "2026-08-31T18:45:00.000Z"; // 00:15 on 1 Sep, IST

  it("formats in IST regardless of the runtime zone", () => {
    // Under a UTC runtime a bare toLocaleString would say 31 Aug here.
    expect(formatIstDate(instant)).toBe("01/09/2026");
    expect(formatIstSlot(instant)).toContain("Sep");
    expect(formatIstSlot(instant)).toContain("1");
  });

  it("renders a time-only value", () => {
    expect(formatIstTime(instant)).toMatch(/12:15/);
  });

  it("is empty for an unusable value", () => {
    expect(formatIstSlot(null)).toBe("");
    expect(formatIstDate(undefined)).toBe("");
  });
});

// --- istInputAfterHours ---

describe("istInputAfterHours", () => {
  it("offsets from a base instant and returns an IST wall clock", () => {
    expect(istInputAfterHours(2, new Date("2026-09-01T00:37:00.000Z"))).toBe(
      "2026-09-01T08:07"
    );
  });
});
