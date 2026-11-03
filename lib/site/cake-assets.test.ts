import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const hash = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

describe("the cake's player engine", () => {
  // Served from public/ so a first visit can start downloading it early. An
  // updated player with the old engine would break the cake without an error
  // anyone sees, because a failed cake just leaves an empty box.
  it("in public/ matches the installed player. After updating it, copy the file again", () => {
    expect(hash("public/dotlottie-player.wasm")).toBe(
      hash("node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm")
    );
  });
});
