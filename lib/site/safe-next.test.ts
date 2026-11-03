import { describe, it, expect } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps pages on this site, with their query", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("/menu/daily")).toBe("/menu/daily");
    expect(safeNext("/orders/SAV-1?phone=123#top")).toBe("/orders/SAV-1?phone=123#top");
  });

  it("refuses anything that would run as code", () => {
    expect(safeNext("javascript:alert(1)")).toBeNull();
    expect(safeNext("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeNext(" javascript:alert(1)")).toBeNull();
    expect(safeNext("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("refuses addresses that leave the site, however they're disguised", () => {
    for (const bad of [
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "\\\\example.com",
      "/\t/example.com",
      "/\n/example.com",
      "/\\\t/example.com",
      "http:example.com",
    ]) {
      expect(safeNext(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("treats nothing as nothing", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext("")).toBeNull();
  });
});
