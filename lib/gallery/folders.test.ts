import { describe, it, expect } from "vitest";
import { folderNameProblem, folderSlug, GALLERY_FOLDERS } from "./folders";

describe("a new folder's slug", () => {
  it("comes from its name", () => {
    expect(folderSlug("Bento Cakes", [])).toBe("bento-cakes");
    expect(folderSlug("  Kids' Birthday Cakes!! ", [])).toBe("kids-birthday-cakes");
    expect(folderSlug("Crème Brûlée", [])).toBe("creme-brulee");
  });

  it("never clashes with one already there", () => {
    expect(folderSlug("Bento Cakes", ["bento-cakes"])).toBe("bento-cakes-2");
    expect(folderSlug("Bento Cakes", ["bento-cakes", "bento-cakes-2"])).toBe("bento-cakes-3");
  });

  it("is still valid with no letters or numbers in the name", () => {
    expect(folderSlug("🎂🎂", [])).toBe("folder");
    expect(folderSlug("🎂", ["folder"])).toBe("folder-2");
  });

  it("always fits the database's rule", () => {
    for (const name of ["Bento Cakes", "---", "A".repeat(60), "3D", "x - y"]) {
      expect(folderSlug(name, [])).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe("a folder name", () => {
  it("needs something in it, and not too much", () => {
    expect(folderNameProblem("   ", [])).toMatch(/name/);
    expect(folderNameProblem("A".repeat(41), [])).toMatch(/40/);
    expect(folderNameProblem("Bento Cakes", [])).toBeNull();
  });

  it("can't repeat another folder's, whatever the capitals", () => {
    expect(folderNameProblem("floral cakes", GALLERY_FOLDERS)).toMatch(/already/);
    expect(folderNameProblem(" Floral Cakes ", GALLERY_FOLDERS)).toMatch(/already/);
  });
});
