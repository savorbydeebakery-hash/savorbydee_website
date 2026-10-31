import { describe, it, expect } from "vitest";
import { youtubeIdFrom, youtubeThumb, youtubeEmbed } from "./youtube";

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
