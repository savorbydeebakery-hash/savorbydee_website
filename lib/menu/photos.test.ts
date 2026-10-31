import { describe, it, expect } from "vitest";
import { applyPhotoRule, showPreorderPhotos } from "./photos";

const items = [
  { id: "d", daily_menu: true, image_url: "daily.jpg" },
  { id: "p", daily_menu: false, image_url: "preorder.jpg" },
  { id: "u", image_url: "unknown.jpg" },
];

describe("applyPhotoRule", () => {
  it("drops preorder photos and keeps Today's Menu ones", () => {
    const out = applyPhotoRule(items, false);
    expect(out.map((i) => i.image_url)).toEqual(["daily.jpg", null, "unknown.jpg"]);
  });

  it("leaves everything alone when preorder photos are switched on", () => {
    expect(applyPhotoRule(items, true).map((i) => i.image_url)).toEqual(["daily.jpg", "preorder.jpg", "unknown.jpg"]);
  });

  it("copes with no items", () => {
    expect(applyPhotoRule(null, false)).toEqual([]);
  });
});

describe("showPreorderPhotos", () => {
  it("is off unless the setting is exactly true", () => {
    expect(showPreorderPhotos(null)).toBe(false);
    expect(showPreorderPhotos({})).toBe(false);
    expect(showPreorderPhotos({ show_preorder_photos: true })).toBe(true);
  });
});
