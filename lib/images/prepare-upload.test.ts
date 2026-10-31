import { describe, it, expect } from "vitest";
import { imageLooksComplete } from "./prepare-upload";

const jpeg = (end: number[]) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(7), ...end]);

describe("imageLooksComplete", () => {
  it("accepts a JPEG that ends with its end marker", () => {
    expect(imageLooksComplete(jpeg([0xff, 0xd9]))).toBe(true);
    expect(imageLooksComplete(jpeg([0xff, 0xd9, 0, 0, 0]))).toBe(true); // padding after it
  });

  it("refuses a JPEG cut off part-way (the Butterscotch Bento upload)", () => {
    // That file ended ...27 04 10 3a: no FF D9 anywhere near the end.
    expect(imageLooksComplete(jpeg([0x27, 0x04, 0x10, 0x3a]))).toBe(false);
  });

  it("checks PNG for its IEND chunk", () => {
    const head = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(50).fill(1)];
    const iend = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
    expect(imageLooksComplete(new Uint8Array([...head, ...iend]))).toBe(true);
    expect(imageLooksComplete(new Uint8Array(head))).toBe(false);
  });

  it("checks WebP against the length in its header", () => {
    const webp = (declared: number, total: number) => {
      const b = new Uint8Array(total);
      b.set([0x52, 0x49, 0x46, 0x46], 0);
      b.set([declared & 255, (declared >> 8) & 255, (declared >> 16) & 255, (declared >>> 24) & 255], 4);
      b.set([0x57, 0x45, 0x42, 0x50], 8);
      return b;
    };
    expect(imageLooksComplete(webp(92, 100))).toBe(true);
    expect(imageLooksComplete(webp(500, 100))).toBe(false);
  });

  it("refuses an empty or tiny file", () => {
    expect(imageLooksComplete(new Uint8Array(4))).toBe(false);
  });
});
