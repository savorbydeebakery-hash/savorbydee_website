import { describe, it, expect } from "vitest";
import { imageLooksComplete } from "./prepare-upload";

// SOI, an APP0 header segment, a scan (SOS + image data), then what follows.
const seg = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 255, ...body];
const scan = [...seg(0xda, [1, 1, 0, 0, 63, 0]), 0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, ...new Array(200).fill(7)];
const jpeg = (end: number[], head: number[] = []) =>
  new Uint8Array([0xff, 0xd8, ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]), ...head, ...scan, ...end]);
const EOI = [0xff, 0xd9];

describe("imageLooksComplete", () => {
  it("accepts a JPEG that ends with its end marker", () => {
    expect(imageLooksComplete(jpeg(EOI))).toBe(true);
    expect(imageLooksComplete(jpeg([...EOI, 0, 0, 0]))).toBe(true); // padding after it
  });

  it("accepts a Samsung photo with its data after the end (client, 2026-11-01)", () => {
    // Samsung adds a trailer ending "SEFT" (or a whole video) after FF D9.
    const seft = [...new Array(5000).fill(0), 0x53, 0x45, 0x46, 0x54];
    expect(imageLooksComplete(jpeg([...EOI, ...seft]))).toBe(true);
  });

  it("refuses a JPEG cut off part-way (the Butterscotch Bento upload)", () => {
    // That file ended ...27 04 10 3a: cut off inside the image data.
    expect(imageLooksComplete(jpeg([0x27, 0x04, 0x10, 0x3a]))).toBe(false);
  });

  it("isn't fooled by the end marker of the small preview inside the camera data", () => {
    const exifWithThumb = seg(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, 0xff, 0xd8, 1, 2, 0xff, 0xd9]);
    expect(imageLooksComplete(jpeg([0x27, 0x04], exifWithThumb))).toBe(false);
    expect(imageLooksComplete(jpeg(EOI, exifWithThumb))).toBe(true);
  });

  it("checks PNG for its IEND chunk", () => {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = [0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...new Array(13).fill(1), 0, 0, 0, 0];
    const iend = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
    expect(imageLooksComplete(new Uint8Array([...sig, ...ihdr, ...iend]))).toBe(true);
    expect(imageLooksComplete(new Uint8Array([...sig, ...ihdr, ...iend, 9, 9, 9]))).toBe(true);
    expect(imageLooksComplete(new Uint8Array([...sig, ...ihdr]))).toBe(false);
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
