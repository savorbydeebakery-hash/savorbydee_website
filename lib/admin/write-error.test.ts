import { describe, it, expect } from "vitest";
import { describeWriteError } from "./write-error";

describe("describeWriteError", () => {
  it("explains a foreign key failure in terms of what to do", () => {
    const msg = describeWriteError(
      {
        code: "23503",
        message: 'update or delete on table "categories" violates foreign key constraint',
      },
      "this category"
    );
    expect(msg).toContain("move its items first");
    // The raw constraint text is not put in front of the client.
    expect(msg).not.toContain("foreign key constraint");
  });

  it("explains the notice and bulk check constraints", () => {
    // menu_items_bulk_threshold_sane, from migration 00032.
    const msg = describeWriteError({
      code: "23514",
      message: 'new row violates check constraint "menu_items_bulk_threshold_sane"',
    });
    expect(msg).toContain("at least 1");
  });

  it("tells the client to sign in again when RLS refuses", () => {
    expect(describeWriteError({ code: "42501", message: "permission denied" })).toContain(
      "sign in again"
    );
  });

  it("says a migration is missing rather than showing a column error", () => {
    const msg = describeWriteError({
      code: "PGRST204",
      message: "Could not find the 'weight_multipliers' column of 'categories'",
    });
    expect(msg).toContain("migration");
    // The column name is kept — it is the one detail that identifies which.
    expect(msg).toContain("weight_multipliers");
  });

  it("passes an unrecognised error through rather than hiding it", () => {
    expect(describeWriteError({ code: "XX000", message: "server exploded" })).toBe(
      "Could not save: server exploded"
    );
  });

  it("still says something when there is no message at all", () => {
    expect(describeWriteError({ message: "" }, "this item")).toBe("Could not save this item.");
  });
});
