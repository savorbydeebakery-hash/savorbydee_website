import { describe, it, expect, vi, afterEach } from "vitest";
import { isYoutubeShort, videoItem, youtubeIdFrom, youtubeThumb, youtubeEmbed } from "./youtube";

describe("youtubeIdFrom", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=12s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abcdef`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `youtube.com/watch?v=${id}`,
    `  ${id}  `,
  ])("reads %s", (link) => {
    expect(youtubeIdFrom(link)).toBe(id);
  });

  it.each(["", "not a link", "https://vimeo.com/123456", "https://youtube.com/watch?v=short", "https://example.com/watch?v=dQw4w9WgXcQ"])(
    "refuses %s",
    (link) => {
      expect(youtubeIdFrom(link)).toBeNull();
    }
  );
});

describe("thumb and embed", () => {
  it("build from the id", () => {
    expect(youtubeThumb("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(youtubeEmbed("dQw4w9WgXcQ")).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
});

describe("Shorts and full videos", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a Short has the upright thumbnail, and a full video doesn't", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    expect(await isYoutubeShort("h8e6KLKbj48")).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    expect(await isYoutubeShort("dQw4w9WgXcQ")).toBe(false);
  });

  it("YouTube being unreachable falls back to widescreen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timed out"); }));
    expect(await isYoutubeShort("dQw4w9WgXcQ")).toBe(false);
  });

  it("each shape uses its own thumbnail", () => {
    expect(videoItem("h8e6KLKbj48", null, true)).toMatchObject({ portrait: true, src: expect.stringContaining("oardefault") });
    expect(videoItem("dQw4w9WgXcQ")).toMatchObject({ portrait: false, src: expect.stringContaining("hqdefault") });
  });
});
