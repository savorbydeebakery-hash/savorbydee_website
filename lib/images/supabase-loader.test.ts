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
    expect(url.searchParams.get("resize")).toBe("cover");
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
