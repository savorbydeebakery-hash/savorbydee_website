/**
 * Verify that the scroll-world clips actually join up.
 *
 * Veo is given a first and last frame, but it does not always land exactly on
 * the last frame. This extracts the REAL final frame of each clip and the real
 * opening frame of the next, then scores how similar they are with SSIM.
 *
 * Also stitches a full-flight preview so you can watch the whole thing before
 * handing the assets over.
 *
 * Usage:  node scripts/check-seams.mjs [dir]      (default public/scroll-world)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "public/scroll-world");
const ORDER = ["dive.mp4", "connector-1.mp4", "connector-2.mp4", "connector-3.mp4"];
const tmp = join(dir, ".seam-check");

function ff(args) {
  return execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function frame(clip, where, out) {
  const args = where === "last"
    ? ["-sseof", "-0.12", "-i", clip, "-frames:v", "1", "-q:v", "2", out]
    : ["-i", clip, "-frames:v", "1", "-q:v", "2", out];
  ff(args);
}

/** SSIM between two stills. 1.0 = identical. */
function ssim(a, b) {
  try {
    const out = execFileSync(
      "ffmpeg",
      ["-hide_banner", "-i", a, "-i", b, "-lavfi", "ssim", "-f", "null", "-"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    const m = /All:([0-9.]+)/.exec(out);
    return m ? Number(m[1]) : null;
  } catch (e) {
    const m = /All:([0-9.]+)/.exec(String(e.stderr ?? ""));
    return m ? Number(m[1]) : null;
  }
}

const missing = ORDER.filter((f) => !existsSync(join(dir, f)));
if (missing.length) {
  console.error(`Missing in ${dir}:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

console.log(`\nSeam check  (${dir})\n`);
let worst = 1;

for (let i = 0; i < ORDER.length - 1; i++) {
  const a = join(dir, ORDER[i]);
  const b = join(dir, ORDER[i + 1]);
  const aEnd = join(tmp, `${i}-a-last.jpg`);
  const bStart = join(tmp, `${i}-b-first.jpg`);

  frame(a, "last", aEnd);
  frame(b, "first", bStart);

  const score = ssim(aEnd, bStart);
  worst = Math.min(worst, score ?? 0);

  const verdict =
    score === null ? "could not score"
    : score >= 0.95 ? "seamless"
    : score >= 0.85 ? "slight drift, probably fine once crossfaded"
    : "VISIBLE JUMP - re-render";

  console.log(
    `  ${ORDER[i].padEnd(16)} -> ${ORDER[i + 1].padEnd(16)}  SSIM ${
      score === null ? " n/a " : score.toFixed(3)
    }  ${verdict}`
  );
}

// Full-flight preview.
const list = join(tmp, "list.txt");
const entries = ORDER.map(
  (f) => "file '" + join(dir, f).split(String.fromCharCode(92)).join("/") + "'"
);
writeFileSync(list, entries.join("\n"));
const preview = join(dir, "full-flight-preview.mp4");
try {
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", preview]);
  console.log(`\n  Preview written: ${preview}`);
} catch {
  // Codec/params differ between clips; re-encode instead of stream-copying.
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-crf", "20", "-preset", "medium", preview]);
  console.log(`\n  Preview written (re-encoded): ${preview}`);
}

console.log(
  worst >= 0.95
    ? "\n  All seams clean.\n"
    : "\n  Frames that scored low: extract the real last frame and feed THAT\n  as the next clip's first frame instead of the original still:\n    ffmpeg -sseof -0.12 -i connector-1.mp4 -frames:v 1 -q:v 2 real-last.jpg\n"
);
