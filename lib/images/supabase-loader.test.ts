import { describe, it, expect } from "vitest";
import supabaseImageLoader from "./supabase-loader";

const BASE = "https://tkzbroymiyvnigqxcpze.supabase.co";
const OBJECT = `${BASE}/storage/v1/object/public/gallery/savor-cake.jpg`;

describe("supabaseImageLoader", () => {
  it("rewrites a public object URL to the render endpoint", () => {
    const url = new URL(supabaseImageLoader({ src: OBJECT, width: 640 }));
    expect(url.pathname).toBe("/storage/v1/render/image/public/gallery/savor-cake.jpg");
  });

  it("passes width, quality and resize through", () => {
    const url = new URL(supabaseImageLoader({ src: OBJECT, width: 640, quality: 60 }));
    expect(url.searchParams.get("width")).toBe("640");
    expect(url.searchParams.get("quality")).toBe("60");
    expect(url.searchParams.get("resize")).toBe("contain");
  });

  // Regression: the loader used to send resize=cover by default. Supabase's
  // `cover` fills BOTH dimensions, so with a width and no height it returns
  // the source height untouched — ?width=640 on a 3000x4000 photo came back
  // 640x4000. Every image on the site shipped at full source height, and the
  // fixed aspect boxes hid it. `contain` is the only correct value here.
  it("never asks for cover, which does not scale height when width is alone", () => {
    for (const w of [96, 384, 640, 1200, 2304]) {
      const url = new URL(supabaseImageLoader({ src: OBJECT, width: w }));
      expect(url.searchParams.get("resize")).toBe("contain");
      expect(url.searchParams.get("height")).toBeNull();
    }
  });

  // The #contain hint no longer changes the transform, but leaving it on the
  // end of the path would 404.
  it("strips the #contain hint from the path", () => {
    const url = new URL(supabaseImageLoader({ src: `${OBJECT}#contain`, width: 640 }));
    expect(url.pathname.endsWith("#contain")).toBe(false);
    expect(url.pathname).toBe("/storage/v1/render/image/public/gallery/savor-cake.jpg");
  });

  it("defaults quality to 72 when not supplied", () => {
    const url = new URL(supabaseImageLoader({ src: OBJECT, width: 384 }));
    expect(url.searchParams.get("quality")).toBe("72");
  });

  it("clamps width to Supabase's transform ceiling", () => {
    const url = new URL(supabaseImageLoader({ src: OBJECT, width: 4000 }));
    expect(url.searchParams.get("width")).toBe("2500");
  });

  // The custom loader receives EVERY next/image src, so anything that is not a
  // Supabase public object must come back byte-identical or it 404s.
  it.each([
    ["local public asset", "/homepage.png"],
    ["unsplash seed from migration 00011", "https://images.unsplash.com/photo-1578985545062?w=800"],
    ["already-rendered supabase url", `${BASE}/storage/v1/render/image/public/gallery/x.jpg`],
    ["signed url", `${BASE}/storage/v1/object/sign/gallery/x.jpg?token=abc`],
  ])("passes through a %s unchanged", (_label, src) => {
    expect(supabaseImageLoader({ src, width: 640, quality: 70 })).toBe(src);
  });
});
