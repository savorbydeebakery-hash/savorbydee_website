import { describe, it, expect } from "vitest";
import {
  pickMenuPhoto,
  DAILY_MENU_PHOTO_KEYWORDS,
  PREORDER_MENU_PHOTO_KEYWORDS,
  CUSTOM_ORDER_PHOTO_KEYWORDS,
} from "./menu-photo";

// The opening of the live gallery, in order. It leads with custom-order work,
// which is why "just take the first one" is the wrong default.
const liveGallery = [
  { image_url: "/3d-1.jpg", caption: "3D Cakes 1." },
  { image_url: "/3d-2.jpg", caption: "3D cakes 2" },
  { image_url: "/bento-1.jpg", caption: "Bento Cakes 1" },
  { image_url: "/bento-2.jpg", caption: "Bento cakes 2" },
  { image_url: "/cookies.jpg", caption: "Custom Cookies" },
  { image_url: "/cupcakes.jpg", caption: "Custom Cupcakes" },
  { image_url: "/tier-1.jpg", caption: "Tier Cakes 1" },
];

describe("pickMenuPhoto", () => {
  it("picks a bento shot for today's menu, not the 3D cake at the top", () => {
    // Bento cakes are actually on the daily list. 3D cakes are custom-order
    // work and are on neither menu.
    expect(pickMenuPhoto(liveGallery, DAILY_MENU_PHOTO_KEYWORDS, 0)).toBe("/bento-1.jpg");
  });

  it("picks a cupcake shot for the preorder menu", () => {
    expect(pickMenuPhoto(liveGallery, PREORDER_MENU_PHOTO_KEYWORDS, 1)).toBe("/cupcakes.jpg");
  });

  it("matches a caption whatever its capitalisation", () => {
    // The live captions run "Bento Cakes 1" and "Bento cakes 2".
    expect(pickMenuPhoto([{ image_url: "/x.jpg", caption: "bento CAKES 9" }], ["Bento"])).toBe(
      "/x.jpg"
    );
  });

  it("tries each keyword in turn", () => {
    // No cupcakes in this gallery, so it falls through to "bakery".
    const photos = [
      { image_url: "/a.jpg", caption: "Tier cakes 3" },
      { image_url: "/b.jpg", caption: "Bakery" },
    ];
    expect(pickMenuPhoto(photos, PREORDER_MENU_PHOTO_KEYWORDS, 0)).toBe("/b.jpg");
  });

  it("falls back to position when nothing matches", () => {
    const photos = [
      { image_url: "/a.jpg", caption: "Tier cakes 3" },
      { image_url: "/b.jpg", caption: "Tier cakes 4" },
    ];
    expect(pickMenuPhoto(photos, ["bento"], 1)).toBe("/b.jpg");
  });

  it("wraps rather than returning nothing when the gallery is short", () => {
    // The second card must still get a photo from a one-photo gallery.
    expect(pickMenuPhoto([{ image_url: "/only.jpg", caption: "x" }], ["bento"], 1)).toBe(
      "/only.jpg"
    );
  });

  it("skips rows with no image rather than returning null for them", () => {
    const photos = [
      { image_url: null, caption: "Bento Cakes 1" },
      { image_url: "/real.jpg", caption: "Tier cakes 3" },
    ];
    expect(pickMenuPhoto(photos, ["bento"], 0)).toBe("/real.jpg");
  });

  it("is null for an empty or missing gallery", () => {
    expect(pickMenuPhoto([], ["bento"])).toBeNull();
    expect(pickMenuPhoto(null, ["bento"])).toBeNull();
    expect(pickMenuPhoto(undefined, ["bento"])).toBeNull();
    expect(pickMenuPhoto([{ image_url: null, caption: "x" }], ["bento"])).toBeNull();
  });
});

describe("custom order photo", () => {
  it("picks a showpiece — the thing a custom order actually is", () => {
    // Tier and 3D cakes are custom-order work, which is precisely why they are
    // the wrong default for the two menus and the right one here.
    expect(pickMenuPhoto(liveGallery, CUSTOM_ORDER_PHOTO_KEYWORDS, 2)).toBe("/tier-1.jpg");
  });

  it("does not collide with the menu cards on the same gallery", () => {
    const daily = pickMenuPhoto(liveGallery, DAILY_MENU_PHOTO_KEYWORDS, 0);
    const preorder = pickMenuPhoto(liveGallery, PREORDER_MENU_PHOTO_KEYWORDS, 1);
    const custom = pickMenuPhoto(liveGallery, CUSTOM_ORDER_PHOTO_KEYWORDS, 2);
    expect(new Set([daily, preorder, custom]).size).toBe(3);
  });
});
